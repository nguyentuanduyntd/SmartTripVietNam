import "server-only";
import { createHash, createHmac, sign, timingSafeEqual } from "node:crypto";
import {z} from "zod";
import type { AiItineraryPlan, AiPlannerRequest } from "@/src/schemas/ai-itinerary.schema";

const PROOF_VERSION = 1;

const PROOF_TTL_MS = 30 * 60 * 1000;

export class AiItineraryGenerationProofError extends Error {
    constructor(message: string){
        super(message);
        this.name = "AiItineraryGenerationProofError";
    }
}

const proofPayloadSchema = z.object({
    version: z.literal(PROOF_VERSION),
    userId: z.string().min(1),
    locationId: z.string().uuid(),
    requestDigest: z.string().regex(/^[a-f0-9]{64}$/),
    planDigest: z.string().regex(/^[a-f0-9]{64}$/),
    allowedDestinationIds: z.array(z.string().uuid()).max(100),
    allowedCuisineIds: z.array(z.string().uuid()).max(100),
    issuedAt: z.number().int().positive(),
    expiresAt: z.number().int().positive(),
});

type ProofPayload = z.infer<typeof proofPayloadSchema>;

function stableStringify(value: unknown): string{
    if(value === undefined){
        return "null";
    }
    if(value === null || typeof value !== "object"){
        return JSON.stringify(value);
    }
    if(Array.isArray(value)){
        return  `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    const entries = Object.entries(value as Record<string, unknown>).filter((
        [entryValue],
    ) => entryValue !== undefined).sort(([keyA], [keyB],) => keyA.localeCompare(keyB));

    const serializedEntries = entries.map(([key, entryValue],)=> `${JSON.stringify(key,)}:${stableStringify(entryValue,)}`,);

    return `{${serializedEntries.join(",",)}}`;
}

function createDigest(value: unknown){
    return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function getProofSecret(){
    const secret = process.env.AI_ITINERARY_PROOF_SECRET?.trim();

    if(!secret || secret.length < 32){
        throw new Error( "AI_ITINERARY_PROOF_SECRET chưa được cấu hình hoặc quá ngắn. Secret phải có ít nhất 32 ký tự.");
    }
    return secret;
}

function signPayload(encodedPayload: string){
    return createHmac("sha256", getProofSecret()).update(encodedPayload).digest("base64url");

}

function safeSignatureEqual(actual: string, expected: string){
    const actualBuffer = Buffer.from(actual, "utf8");

    const expectedBuffer = Buffer.from(expected, "utf8");

    if(actualBuffer.length !== expectedBuffer.length){
        return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createAiItineraryGenerationProof(input: {
    userId: string;
    request: AiPlannerRequest,
    plan: AiItineraryPlan,
    allowedDestinationIds: Iterable<string>;
    allowedCuisineIds: Iterable<string>;
}){
    const now = Date.now();
    const payload: ProofPayload = {
        version: PROOF_VERSION,
        userId: input.userId,
        locationId: input.request.locationId,
        requestDigest: createDigest(input.request),
        planDigest: createDigest(input.plan),
        allowedDestinationIds:[...new Set(input.allowedDestinationIds,),].sort(),
        allowedCuisineIds:[...new Set(input.allowedCuisineIds,),].sort(),
        issuedAt:now,
        expiresAt:now + PROOF_TTL_MS,
    }
    const encodedPayload = Buffer.from(JSON.stringify(payload),"utf8").toString("base64url");
    const signature = signPayload(encodedPayload);

    return `${encodedPayload}.${signature}`;
}

export function verifyAiItineraryGenerationProof(input: {
     proof: string;
    userId: string;
    request: AiPlannerRequest;
    plan: AiItineraryPlan;
}){
    const parts = input.proof.split(".");
    if(parts.length !== 2){
        throw new AiItineraryGenerationProofError("Generation proof không hợp lệ.");
    }
    const [encodedPayload, signature] = parts;

    if(!encodedPayload || !signature){
         throw new AiItineraryGenerationProofError(
            "Generation proof không hợp lệ.",
        );
    }
     const expectedSignature =
        signPayload(
            encodedPayload,
        );

    if (
        !safeSignatureEqual(
            signature,
            expectedSignature,
        )
    ) {
        throw new AiItineraryGenerationProofError(
            "Generation proof đã bị thay đổi hoặc không hợp lệ.",
        );
    }

    let rawPayload:
        unknown;

    try {
        rawPayload =
            JSON.parse(
                Buffer.from(
                    encodedPayload,
                    "base64url",
                ).toString(
                    "utf8",
                ),
            );
    } catch {
        throw new AiItineraryGenerationProofError(
            "Không thể đọc generation proof.",
        );
    }

    const parsed =
        proofPayloadSchema.safeParse(
            rawPayload,
        );

    if (
        !parsed.success
    ) {
        throw new AiItineraryGenerationProofError(
            "Generation proof có cấu trúc không hợp lệ.",
        );
    }

    const payload =
        parsed.data;

    const now =
        Date.now();

    if (
        payload.expiresAt <=
        now
    ) {
        throw new AiItineraryGenerationProofError(
            "Lịch trình AI đã hết thời gian lưu. Vui lòng tạo lại lịch trình.",
        );
    }

    /**
     * Không cho proof của user A
     * được dùng bởi user B.
     */
    if (
        payload.userId !==
        input.userId
    ) {
        throw new AiItineraryGenerationProofError(
            "Generation proof không thuộc tài khoản hiện tại.",
        );
    }

    /**
     * Location cũng phải giống
     * lần generation ban đầu.
     */
    if (
        payload.locationId !==
        input.request
            .locationId
    ) {
        throw new AiItineraryGenerationProofError(
            "Khu vực của lịch trình đã bị thay đổi.",
        );
    }

    const currentRequestDigest =
        createDigest(
            input.request,
        );

    if (
        payload.requestDigest !==
        currentRequestDigest
    ) {
        throw new AiItineraryGenerationProofError(
            "Thông tin yêu cầu đã bị thay đổi sau khi AI tạo lịch trình.",
        );
    }

    const currentPlanDigest =
        createDigest(
            input.plan,
        );

    if (
        payload.planDigest !==
        currentPlanDigest
    ) {
        throw new AiItineraryGenerationProofError(
            "Nội dung lịch trình đã bị thay đổi sau khi AI tạo.",
        );
    }

    return {
        allowedDestinationIds:
            new Set(
                payload.allowedDestinationIds,
            ),

        allowedCuisineIds:
            new Set(
                payload.allowedCuisineIds,
            ),

        issuedAt:
            payload.issuedAt,

        expiresAt:
            payload.expiresAt,
    };
}