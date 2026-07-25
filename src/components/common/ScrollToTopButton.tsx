"use client";
import { ArrowUp } from "lucide-react";
import {useCallback, useEffect, useState } from "react";

const SHOW_THRESHOLD = 400;

export function ScrollToTopButton(){
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let ticking = false;

        function updateVisibility(){
            setIsVisible(window.scrollY > SHOW_THRESHOLD);
            ticking = true;
        }

        function handleScroll(){
            if(ticking) return;
            ticking = true;
            window.requestAnimationFrame(updateVisibility);
        }
        updateVisibility();

        window.addEventListener("scroll", handleScroll, {passive: true});
        return () => window.removeEventListener("scroll", handleScroll);
    },[]);

    const scrollToTop = useCallback(() => {
        window.scrollTo({top: 0, behavior: "smooth"});
    },[]);

    return (
        <button
        type="button"
        onClick={scrollToTop}
        aria-label="Cuộn lên đầu trang"
        className={`fixed bottom-6 right-5 z-50 grid h-12 w-12 place-items-center rounded-full bg-[#f25f4b] text-white shadow-[0_14px_35px_rgba(242,95,75,0.35)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#df4e3b] sm:bottom-8 sm:right-8 ${
            isVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
        >
        <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
    );
}