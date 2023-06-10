
# TikTokClipper
A simple script to generate TikTok SFC clips

[Demo](https://youtu.be/NFYAV9OGI9g)

## Installation/Deployment

### Clone the project

```bash
  git clone https://github.com/gursheyss/TikTokClipper
```

### Go to the project directory

```bash
  cd TikTokClipper
```

### Install dependencies

```bash
  npm install
```

### Add the following files to the directory

`video.mp4` - The video you want to clip

`gameplay.mp4` - The gameplay you want to add to the bottom

### Edit the following files

`timestamps.txt` - Add timestamp ranges separated by new lines for each part you'd like to clip

ex.
```bash
  0:00-2:10
  5:32-6:24
  6:35-9:25
```

### Run 

```bash
  npm run start
```