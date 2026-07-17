import "server-only";
import { v2 as cloudinary} from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if(!cloudName || !apiKey || !apiSecret){
    throw new Error("Missing cloudinary enviroment variable");
}

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    apo_secret: apiSecret,
    secure: true,
});

export { cloudinary };