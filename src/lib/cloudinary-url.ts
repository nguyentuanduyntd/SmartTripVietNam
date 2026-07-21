export interface CloudinaryImageOptions {
    width?: number;
    height?: number;
    crop?: "fill" | "fit" | "limit" | "scale" | "thumb";
    gravity?:| "auto"| "center"| "north"| "south"| "east"| "west"| "face";
    quality?: "auto" | number;
    format?: "auto" | "webp" | "avif" | "jpg" | "png";
}

const CLOUD_NAME =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();

function encodePublicId(publicId: string): string {
    return publicId
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
}

/**
 * Tạo URL ảnh Cloudinary đã tối ưu bằng f_auto, q_auto.
 *
 * `source` có thể là:
 * - Public ID Cloudinary:
 *   smart-trip-vietnam/home/hero/hue
 *
 * - URL HTTPS đầy đủ lấy trực tiếp từ Cloudinary.
 */
export function cloudinaryImageUrl(
    source: string,
    options: CloudinaryImageOptions = {},
): string {
    const normalizedSource = source.trim();

    if (!normalizedSource) {
        return "";
    }

    if (/^https?:\/\//i.test(normalizedSource)) {
        return normalizedSource;
    }

    if (!CLOUD_NAME) {
        return "";
    }

    const transformations: string[] = [];

    if (options.width) {
        transformations.push(`w_${options.width}`);
    }

    if (options.height) {
        transformations.push(`h_${options.height}`);
    }

    transformations.push(`c_${options.crop ?? "fill"}`);
    transformations.push(`g_${options.gravity ?? "auto"}`);
    transformations.push(`q_${options.quality ?? "auto"}`);
    transformations.push(`f_${options.format ?? "auto"}`);

    return `https://res.cloudinary.com/${encodeURIComponent(
        CLOUD_NAME,
    )}/image/upload/${transformations.join(",")}/${encodePublicId(
        normalizedSource,
    )}`;
}