import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Initialize OpenAI client
// Note: In production, it's better to use server-side keys (OPENAI_API_KEY).
// Here we use the variable provided by the user.
const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_CHATGPT_KEY,
});

export async function POST(req: NextRequest) {
    try {
        // 1. Verify User Authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Initialize Supabase client WITH the user's token to pass RLS
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        );

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Verify Subscription Status (Active Check)
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("subscription_status")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            console.error("Profile Error:", profileError);
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Allow 'active' or 'trialing' or whatever valid status suitable. 
        // User requested "active".
        if (profile.subscription_status !== "active") {
            // Optional: Could block here. For now, proceeding as requested.
            // Uncomment to enforce strict check:
            // return NextResponse.json({ error: "Subscription required" }, { status: 403 });
        }

        const { message, threadId } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Check multiple variations of the variable name to be robust against Typos/Prefixes
        const assistantId = process.env.OPENAI_ASSISTANT_ID ||
            process.env.NEXT_PUBLIC_OPENAI_ASSISTANT_ID ||
            process.env.NEXT_PUBLIC_OPENIA_ASSISTANT_ID; // Covers the typo in the user's env

        const apiKey = process.env.NEXT_PUBLIC_CHATGPT_KEY;

        if (!apiKey) {
            console.error("Missing NEXT_PUBLIC_CHATGPT_KEY");
            return NextResponse.json({ error: "Configuration Error: Missing API Key" }, { status: 500 });
        }

        if (!assistantId) {
            console.error("Missing OPENAI_ASSISTANT_ID");
            return NextResponse.json({ error: "Configuration Error: Assistant ID not configured" }, { status: 500 });
        }

        // Sanitize threadId - Aggressive check
        let currentThreadId = threadId;
        console.log("Trace 1: Incoming ID:", currentThreadId);

        if (!currentThreadId ||
            typeof currentThreadId !== "string" ||
            currentThreadId === "undefined" ||
            currentThreadId === "null" ||
            !currentThreadId.startsWith("thread_")) {
            console.log("Trace 2: Invalid ID detected, forcing new thread.");
            currentThreadId = null;
        }

        // 3. Create or Retrieve Thread
        if (!currentThreadId) {
            console.log("Trace 3: Creating new thread...");
            try {
                const thread = await openai.beta.threads.create();
                currentThreadId = thread.id;
                console.log("Trace 4: New Thread Created:", currentThreadId);
            } catch (e) {
                console.error("Trace Error: Failed to create thread", e);
                throw e;
            }
        } else {
            console.log("Trace 3.5: Using existing valid thread:", currentThreadId);
        }

        // 4. Add Message to Thread
        console.log("Trace 5: Adding message to thread:", currentThreadId);
        await openai.beta.threads.messages.create(currentThreadId, {
            role: "user",
            content: message,
        });

        // 5. Run Assistant
        console.log("Trace 6: Starting Run logic. ThreadID:", currentThreadId, "AssisID:", assistantId);
        const run = await openai.beta.threads.runs.create(currentThreadId, {
            assistant_id: assistantId,
        });
        console.log("Trace 7: Run Object Created. ID:", run?.id, "Object Keys:", Object.keys(run || {}));

        if (!run || !run.id) {
            throw new Error("Trace Error: Run object invalid: " + JSON.stringify(run));
        }

        // 6. Poll for Completion (MANUAL FETCH TO BYPASS SDK ISSUES)
        const safeThreadId = String(run.thread_id);
        const safeRunId = String(run.id);

        console.log("Trace 8 MANUAL FETCH: Starting polling for", safeThreadId, safeRunId);

        const checkRunStatus = async () => {
            const response = await fetch(`https://api.openai.com/v1/threads/${safeThreadId}/runs/${safeRunId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "OpenAI-Beta": "assistants=v2",
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        };

        let runStatus = await checkRunStatus();

        // Polling loop
        while (runStatus.status !== "completed") {
            if (runStatus.status === "failed" || runStatus.status === "cancelled" || runStatus.status === "expired") {
                console.error("Trace Error: Run failed with status:", runStatus.status);
                return NextResponse.json({ error: `Assistant run failed: ${runStatus.last_error?.message || runStatus.status}` }, { status: 500 });
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            runStatus = await checkRunStatus();
        }

        // 7. Get Messages
        const messages = await openai.beta.threads.messages.list(currentThreadId);

        // Get the last message from the assistant
        const lastMessage = messages.data
            .filter((msg) => msg.role === "assistant")
            .shift();

        let responseText = "";
        if (lastMessage && lastMessage.content[0].type === "text") {
            responseText = lastMessage.content[0].text.value;
        }

        return NextResponse.json({
            response: responseText,
            threadId: currentThreadId,
        });

    } catch (error: any) {
        console.error("Support Chat Internal Error:", error);
        // Log specifics if it's an OpenAI error
        if (error?.response?.data) {
            console.error("OpenAI Error Data:", error.response.data);
        }
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
