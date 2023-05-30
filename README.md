
# TikTokClipper
A simple script to generate TikTok SFC clips

<iframe width="560" height="315" src="https://www.youtube.com/embed/NFYAV9OGI9g" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## Installation/Deployment

### Clone the project

```bash
  git clone https://github.com/gursheyss/TikTokClipper
```

### Add the following files to the directory

`video.mp4` - The video you want to clip

`gameplay.mp4` - The gameplay you want to add to the bottom

`ffmpeg.exe` and `ffmpegprobe.exe` binaries from [here](https://www.gyan.dev/ffmpeg/builds/)

### Edit the following files

`timestamps.txt` - Add timestamp ranges separated by new lines for each part you'd like to clip

ex. 
```bash
  0:00-2:10
  5:32-6:24
  6:35-9:25
```

### Go to the project directory

```bash
  cd TikTokClipper
```

### Install dependencies

```bash
  npm install
```

### Run main.js

```bash
  node main.js
```