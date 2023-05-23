const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg')
const readline = require('readline')
ffmpeg.setFfmpegPath('./ffmpeg.exe')
ffmpeg.setFfprobePath('./ffprobe.exe')

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

checkExistence('./output', true);
checkExistence('./video.mp4');
checkExistence('./gameplay.mp4');

const rl = readline.createInterface({
    input: fs.createReadStream('./timestamps.txt'),
})

let index = 0;
rl.on('line', (line) => {
    console.log('Clipping video input')
    console.log(line + '\n')
    const [start, end] = line.split('-');
    if (start && end) {
        const clipDuration = calculateDuration(convertStamps(start), convertStamps(end));
        const current_index = index++;
        const outputFilename = `./output/video_output_${current_index}.mp4`;

        new Promise((resolve, reject) => {
            ffmpeg('./video.mp4')
                .seekInput(start)
                .duration(clipDuration)
                .output(outputFilename)
                .on('end', function () {
                    console.log(`Done: ` + outputFilename);
                    resolve();
                })
                .on('error', function (err) {
                    console.log("Error: " + err);
                    reject(err);
                }).run();
        })
            .then(() => {
                return new Promise((resolve, reject) => {
                    ffmpeg.ffprobe('./gameplay.mp4', function (err, metadata) {
                        if (err) {
                            console.error("Error occurred during probing: " + err);
                            reject(err);
                        } else {
                            let gameplayDuration = metadata.format.duration;
                            let randomStart = Math.random() * (gameplayDuration - clipDuration);
                            ffmpeg('./gameplay.mp4')
                                .noAudio()
                                .seekInput(randomStart)
                                .duration(clipDuration)
                                .output(`./output/gameplay_output_${current_index}.mp4`)
                                .on('end', function () {
                                    console.log(`Done: ./output/gameplay_output_${current_index}.mp4`);
                                    resolve();
                                })
                                .on('error', function (err) {
                                    console.log("Error: " + err);
                                    reject(err);
                                }).run();
                        }
                    });
                });
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    ffmpeg()
                        .input(`./output/video_output_${current_index}.mp4`)
                        .input(`./output/gameplay_output_${current_index}.mp4`)
                        .complexFilter([
                            "[0:v]pad=iw:ih*2[bg]; [bg][1:v]overlay=0:H/2"
                        ])
                        .output(`./output/concated_${current_index}.mp4`)
                        .on('end', function () {
                            console.log(`Finished concating file ${current_index}`)
                            resolve();
                        })
                        .on('error', function (err) {
                            console.log("Error: " + err);
                            reject(err);
                        }).run();
                });
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    ffmpeg()
                        .input(`./output/concated_${current_index}.mp4`)
                        .output(`./output/completed_${current_index}.mp4`)
                        .addOptions([
                            '-vf', '[0:v]split=2[blur][vid];[blur]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=luma_radius=min(h\\,w)/20:luma_power=1:chroma_radius=min(cw\\,ch)/20:chroma_power=1[bg];[vid]scale=1080:1920:force_original_aspect_ratio=decrease[ov];[bg][ov]overlay=(W-w)/2:(H-h)/2',
                        ])
                        .on('end', function() {
                            console.log(`Finished finalizing file ${current_index}`);
                            resolve();
                        })
                        .on('error', function(err) {
                            console.log('An error occurred: ' + err.message);
                            reject(err);
                        })
                        .run();
                })
            })
            .then(() => {
                return new Promise((resolve) => {
                    // Delete intermediate files
                    deleteFile(`./output/video_output_${current_index}.mp4`);
                    deleteFile(`./output/gameplay_output_${current_index}.mp4`);
                    deleteFile(`./output/concated_${current_index}.mp4`);
                    resolve();
                });
            })
            .catch((error) => {
                console.log('An error occurred: ', error);
            });
    }
});