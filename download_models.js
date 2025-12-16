
import fs from 'fs';
import https from 'https';
import path from 'path';

const models = [
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "age_gender_model-weights_manifest.json",
    "age_gender_model-shard1",
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2"
];

const baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/";
const outputDir = "./public/models";

models.forEach(file => {
    const fileUrl = baseUrl + file;
    const filePath = path.join(outputDir, file);

    const fileStream = fs.createWriteStream(filePath);
    https.get(fileUrl, function (response) {
        response.pipe(fileStream);
        fileStream.on('finish', function () {
            fileStream.close();
            console.log("Downloaded " + file);
        });
    });
});
