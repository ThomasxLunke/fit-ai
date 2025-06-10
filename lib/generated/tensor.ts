// import * as bodySegmentation from '@tensorflow-models/body-segmentation'
// import * as tf from '@tensorflow/tfjs-core'
// // Register WebGL backend.
// import '@tensorflow/tfjs-backend-webgl'

// export const generateTensor = async () => {
//   const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation
//   const segmenterConfig = {
//     runtime: 'mediapipe', // or 'tfjs'
//     solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
//     modelType: 'general',
//   }
//   const segmenter = await bodySegmentation.createSegmenter(
//     model,
//     segmenterConfig
//   )

//   const people = await segmenter.segmentPeople(document.getElementById("webcam"))

// }
