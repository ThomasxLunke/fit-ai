export const startWebcam = (video: HTMLVideoElement) => {
  return navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: { width: 380, height: 460 },
    })
    .then((stream) => {
      video.srcObject = stream
      const track = stream.getTracks()[0]
      video.onloadedmetadata = () => video.play()
    })
    .catch((err) => {
      /* handle the error */
    })
}
