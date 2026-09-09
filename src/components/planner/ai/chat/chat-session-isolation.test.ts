import { describe, expect, it, beforeEach } from "vitest";

// Mock sessionStorage in Node / vitest environment
const mockStorage: Record<string, string> = {};

const mockSessionStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  },
};

Object.defineProperty(globalThis, "window", {
  value: globalThis,
  writable: true,
});

Object.defineProperty(globalThis, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

const CHAT_SESSION_KEY_PREFIX = "smarttrip:ai-planner-chat";

function getChatSessionKey(userId?: string): string | null {
  return userId ? `${CHAT_SESSION_KEY_PREFIX}:${userId}` : null;
}

type ChatSessionData = {
  userId: string;
  messages: any[];
  state: any;
  latestGenerated: any;
  savedAt: number;
};

function saveChatSession(data: ChatSessionData, userId?: string) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  try {
    const key = getChatSessionKey(userId);
    if (!key) return;

    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function loadChatSession(userId?: string): ChatSessionData | null {
  if (typeof window === "undefined" || !userId) {
    return null;
  }

  try {
    sessionStorage.removeItem(CHAT_SESSION_KEY_PREFIX);

    const key = getChatSessionKey(userId);
    if (!key) {
      return null;
    }

    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const data = JSON.parse(raw) as ChatSessionData;

    if (
      !Array.isArray(data.messages) ||
      !data.state ||
      typeof data.savedAt !== "number" ||
      data.userId !== userId
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function clearChatSession(userId?: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.removeItem(CHAT_SESSION_KEY_PREFIX);
    if (userId) {
      const key = getChatSessionKey(userId);
      if (key) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

function clearAllPlannerChats() {
  Object.keys(mockStorage).forEach((key) => {
    if (key.startsWith("smarttrip:ai-planner-chat")) {
      delete mockStorage[key];
    }
  });
}

describe("Chat session isolation by userId", () => {
  beforeEach(() => {
    mockSessionStorage.clear();
  });

  it("stores chat session with userId in key and payload", () => {
    const userA = "user_aaa_111";
    saveChatSession(
      {
        userId: userA,
        messages: [{ role: "user", content: "Lên lịch đi Đà Lạt" }],
        state: { locationName: "Đà Lạt" },
        latestGenerated: null,
        savedAt: Date.now(),
      },
      userA,
    );

    const keyA = `smarttrip:ai-planner-chat:${userA}`;
    expect(mockStorage[keyA]).toBeDefined();

    const loadedA = loadChatSession(userA);
    expect(loadedA).not.toBeNull();
    expect(loadedA?.userId).toBe(userA);
    expect(loadedA?.messages[0].content).toBe("Lên lịch đi Đà Lạt");
  });

  it("prevents Account B from seeing Account A chat", () => {
    const userA = "user_aaa_111";
    const userB = "user_bbb_222";

    // User A chats
    saveChatSession(
      {
        userId: userA,
        messages: [{ role: "user", content: "Kế hoạch đi Phú Quốc bí mật của user A" }],
        state: { locationName: "Phú Quốc" },
        latestGenerated: null,
        savedAt: Date.now(),
      },
      userA,
    );

    // User B logs in and tries to load chat
    const loadedB = loadChatSession(userB);
    expect(loadedB).toBeNull();

    // User A can still load their own chat
    const loadedA = loadChatSession(userA);
    expect(loadedA).not.toBeNull();
    expect(loadedA?.userId).toBe(userA);
    expect(loadedA?.messages[0].content).toBe("Kế hoạch đi Phú Quốc bí mật của user A");
  });

  it("rejects tampered session where key and payload userId mismatch", () => {
    const userB = "user_bbb_222";
    // Maliciously placed session where key is userB but userId payload is userA
    mockStorage[`smarttrip:ai-planner-chat:${userB}`] = JSON.stringify({
      userId: "user_aaa_111",
      messages: [{ role: "user", content: "Should not read this" }],
      state: {},
      latestGenerated: null,
      savedAt: Date.now(),
    });

    const loadedB = loadChatSession(userB);
    expect(loadedB).toBeNull();
  });

  it("removes legacy un-scoped key automatically upon load", () => {
    mockStorage["smarttrip:ai-planner-chat"] = JSON.stringify({
      messages: [{ role: "user", content: "Legacy global chat" }],
      state: {},
      savedAt: Date.now(),
    });

    const loaded = loadChatSession("user_ccc_333");
    expect(loaded).toBeNull();
    expect(mockStorage["smarttrip:ai-planner-chat"]).toBeUndefined();
  });

  it("clears all planner chat sessions upon logout", () => {
    saveChatSession(
      {
        userId: "user_a",
        messages: [{ role: "user", content: "chat a" }],
        state: {},
        latestGenerated: null,
        savedAt: Date.now(),
      },
      "user_a",
    );
    saveChatSession(
      {
        userId: "user_b",
        messages: [{ role: "user", content: "chat b" }],
        state: {},
        latestGenerated: null,
        savedAt: Date.now(),
      },
      "user_b",
    );

    expect(Object.keys(mockStorage).length).toBe(2);

    clearAllPlannerChats();

    expect(Object.keys(mockStorage).length).toBe(0);
    expect(loadChatSession("user_a")).toBeNull();
    expect(loadChatSession("user_b")).toBeNull();
  });
});
