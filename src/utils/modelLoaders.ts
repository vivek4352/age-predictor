
import * as faceapi from 'face-api.js';

export const loadModels = async () => {
    const MODEL_URL = import.meta.env.BASE_URL + 'models';
    try {
        await Promise.all([

            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        return true;
    } catch (error) {
        console.error("Error loading models:", error);
        return false;
    }
};
