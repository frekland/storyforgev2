import 'dotenv/config';
import AWS from 'aws-sdk';

// Configure AWS with your credentials from Vercel environment variables
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION // e.g., 'us-east-1'
});

const s3 = new AWS.S3();
const bucketName = process.env.AWS_S3_BUCKET_NAME;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { fileName, fileType } = req.body;

        const params = {
            Bucket: bucketName,
            Key: fileName,
            Expires: 300, // URL expires in 5 minutes
            ContentType: fileType,
            ACL: 'public-read' // or 'private' depending on your needs
        };

        s3.getSignedUrl('putObject', params, (err, url) => {
            if (err) {
                console.error("Error generating signed URL:", err);
                return res.status(500).json({ message: "Error generating signed URL." });
            }
            res.status(200).json({ signedUrl: url, key: fileName });
        });

    } catch (error) {
        console.error("Error generating signed URL:", error);
        res.status(500).json({ message: "An error occurred generating signed URL." });
    }
}