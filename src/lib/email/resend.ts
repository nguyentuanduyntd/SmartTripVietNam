import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
    throw new Error("RESEND_API_KEY is not defined");
}

export const resend = new Resend(apiKey);

export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "SmartTrip <onboarding@resend.dev>";