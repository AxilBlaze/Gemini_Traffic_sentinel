// Credentials provided by user
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET;

/**
 * Generates SHA-1 signature for Cloudinary signed upload
 */
async function generateSignature(params: Record<string, string>, apiSecret: string): Promise<string> {
  // 1. Sort params keys
  const orderedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  const stringToSign = orderedParams + apiSecret;

  // 2. Hash using SHA-1
  const msgBuffer = new TextEncoder().encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);

  // 3. Convert to Hex
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function uploadToCloudinary(base64Data: string): Promise<string> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error("Cloudinary credentials missing");
    return "https://placehold.co/600x400?text=Cloudinary+Not+Configured";
  }

  // Create timestamp
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Generate Signature
  // Signed uploads require: timestamp, api_key, signature
  let signature;
  try {
    signature = await generateSignature({ timestamp }, API_SECRET);
  } catch (e) {
    console.error("Crypto API not available", e);
    return "https://placehold.co/600x400?text=Crypto+Error";
  }

  const formData = new FormData();
  formData.append("file", `data:image/jpeg;base64,${base64Data}`);
  formData.append("api_key", API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return "https://placehold.co/600x400?text=Upload+Failed";
  }
}
