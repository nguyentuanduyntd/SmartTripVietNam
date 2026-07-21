import type {CSSProperties,ReactNode,} from "react";
import {cloudinaryImageUrl,type CloudinaryImageOptions,} from "@/src/lib/cloudinary-url";

interface CloudinaryVisualProps {
    source: string;
    alt: string;
    className?: string;
    imageOptions?: CloudinaryImageOptions;
    children?: ReactNode;
    priority?: boolean;
}

export function CloudinaryVisual({
    source,
    alt,
    className = "",
    imageOptions,
    children,
    priority = false,
}: CloudinaryVisualProps) {
    const imageUrl = cloudinaryImageUrl(
        source,
        imageOptions,
    );

    const style = {
        backgroundImage: imageUrl
            ? `url("${imageUrl}")`
            : undefined,
        contentVisibility: priority
            ? "visible"
            : "auto",
    } satisfies CSSProperties;

    return (
        <div
            className={`bg-[#d7d0c3] bg-cover bg-center ${className}`}
            style={style}
            role="img"
            aria-label={alt}
        >
            {children}
        </div>
    );
}