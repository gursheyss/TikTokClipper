const fs = require('fs')
const readline = require('readline')
const ffmpeg = require('fluent-ffmpeg')

const ffmpegPath = require('@ffmpeg-installer/ffmpeg') //sets up ffmpeg binaries
const ffprobePath = require('@ffprobe-installer/ffprobe')
ffmpeg.setFfmpegPath(ffmpegPath.path)
ffmpeg.setFfprobePath(ffprobePath.path)

if (!fs.existsSync('./output')) {  //file and dir validation
    fs.mkdirSync('./output')
}
if (!fs.existsSync('./timestamps.txt')){
    fs.writeFileSync('./timestamps.txt','0:00-0:01')
}
checkExistence('./video.mp4');
checkExistence('./gameplay.mp4');

function checkExistence(path, isDirectory = false) {
    if (!fs.existsSync(path)) {
        if (isDirectory) {
            fs.mkdirSync(path);
        } else {
            console.log(`${path} doesn't exist... exiting`);
            process.exit(1);
        }
    }
}

function deleteFile(path) {
    fs.unlink(path, (err) => {
        if (err) {
            console.error(`Error deleting file: ${err}`);
        }
    });
}

function calculateDuration(start, end) { //calculate duration from start and end timestamps
    const [startHour, startMin, startSec] = start.split(':').map(Number);
    const [endHour, endMin, endSec] = end.split(':').map(Number);
    return (endHour * 60 * 60 + endMin * 60 + endSec) - (startHour * 60 * 60 + startMin * 60 + startSec);
}

function convertStamps(timestamp) { // convert timestamps to 00:00:00 format
    const sections = timestamp.split(':').map(part => part.padStart(2, '0'));
    while (sections.length < 3) {
        sections.unshift('00')
    }
    return sections.join(':');
}

const rl = readline.createInterface({
    input: fs.createReadStream('./timestamps.txt'),
})

function clipVideo(input, start, clipDuration, outputFilename, noAudio = false) {
    return new Promise((resolve, reject) => {
        let command = ffmpeg(input)
            .seekInput(start)
            .duration(clipDuration);

        if (noAudio) {
            command = command.noAudio();
        }

        command.output(outputFilename)
            .on('end', () => resolve())
            .on('error', err => reject(err))
            .run();
    });
}

function concatVideo(input1, input2, outputFilename) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(input1)
            .input(input2)
            .complexFilter([
                "[0:v]pad=iw:ih*2[bg]; [bg][1:v]overlay=0:H/2"
            ])
            .output(outputFilename)
            .on('end', () => resolve())
            .on('error', err => reject(err))
            .run();
    });
}

function finalizeVideo(input, outputFilename) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(input)
            .output(outputFilename)
            .addOptions([
                '-vf', '[0:v]split=2[blur][vid];' + //splits file into blur and vid stream
                '[blur]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=luma_radius=min(h\\,w)/20:luma_power=1:chroma_radius=min(cw\\,ch)/20:chroma_power=1[bg];' + //blur st ream scaled, cropped, and boxblur applied
                '[vid]scale=1080:1920:force_original_aspect_ratio=decrease[ov];' + //vid stream scaled
                '[bg][ov]overlay=(W-w)/2:(H-h)/2', //add videos on top of eachother
            ])
            .on('end', () => resolve())
            .on('error', err => reject(err))
            .run();
    });
}

async function processLine(line) {
    try {
        console.log('Clipping video input');
        console.log(line + '\n');
        const [start, end] = line.split('-');
        if (start && end) {
            const clipDuration = calculateDuration(convertStamps(start), convertStamps(end));
            const current_index = index++;
            const outputFilename = `./output/video_output_${current_index}.mp4`;

            await clipVideo('./video.mp4', start, clipDuration, outputFilename);
            console.log(`Done: ` + outputFilename);

            let metadata = await new Promise((resolve, reject) => {
                ffmpeg.ffprobe('./gameplay.mp4', (err, metadata) => {
                    if (err) {
                        console.error("Error occurred during probing: " + err);
                        reject(err);
                    } else {
                        resolve(metadata);
                    }
                });
            });

            let gameplayDuration = metadata.format.duration;
            let randomStart = Math.random() * (gameplayDuration - clipDuration);
            await clipVideo('./gameplay.mp4', randomStart, clipDuration, `./output/gameplay_output_${current_index}.mp4`, true);
            console.log(`Done: ./output/gameplay_output_${current_index}.mp4`);

            await concatVideo(`./output/video_output_${current_index}.mp4`, `./output/gameplay_output_${current_index}.mp4`, `./output/concated_${current_index}.mp4`);
            console.log(`Finished concating file ${current_index}`);

            await finalizeVideo(`./output/concated_${current_index}.mp4`, `./output/completed_${current_index}.mp4`);
            console.log(`Finished finalizing file ${current_index}`);

            // Delete intermediate files
            deleteFile(`./output/video_output_${current_index}.mp4`);
            deleteFile(`./output/gameplay_output_${current_index}.mp4`);
            deleteFile(`./output/concated_${current_index}.mp4`);
        }
    } catch (error) {
        console.log('An error occurred: ', error);
    }
}

let index = 0;
rl.on('line', (line) => processLine(line));