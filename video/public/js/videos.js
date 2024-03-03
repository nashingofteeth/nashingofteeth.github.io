const links = document.querySelectorAll('.container a');

links.forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        const video = document.createElement('video'),
              videoMp4Src = document.createElement('source'),
              videoWebMSrc = document.createElement('source');

        video.setAttribute('controls', true);
        video.setAttribute('loop', true);
        video.setAttribute('autoplay', true);
        video.setAttribute('width', this.firstElementChild.lastElementChild.getAttribute('width'));
        video.setAttribute('height', this.firstElementChild.lastElementChild.getAttribute('height'));

        videoMp4Src.setAttribute('type', 'video/mp4');
        videoWebMSrc.setAttribute('type', 'video/webm');

        videoMp4Src.setAttribute('src', this.getAttribute('href'));
        videoWebMSrc.setAttribute('src', this.getAttribute('data-webm'));

        video.appendChild(videoWebMSrc);
        video.appendChild(videoMp4Src);

        this.parentElement.replaceChild(video, this);
    });
});