import { useCallback } from "react";
import { Bot, RotateCcw } from "lucide-react";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { QueryInput } from "@/components/chat/QueryInput";
import { MessageLoading } from "@/components/ui/message-loading";
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from "@/components/ui/chat-bubble";
import { Button } from "@/components/ui/button";
import { useQueryStore } from "@/store/useQueryStore";
import { runQuery, refineQuery } from "@/api/nlq";
import type { ChatMessage as ChatMessageType } from "@/types";

// tiny uuid shim that works without the uuid package
function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ChatPanel() {
  const {
    messages, addMessage, updateMessage, clearMessages,
    conversationId, setConversationId,
    setActiveResult, addHistory,
    isQuerying, setIsQuerying,
  } = useQueryStore();

  const handleSubmit = useCallback(async (prompt: string) => {
    if (isQuerying) return;

    // Add user message
    const userId = genId();
    addMessage({ id: userId, role: "user", content: prompt, timestamp: new Date() });

    // Add loading assistant placeholder
    const assistantId = genId();
    addMessage({ id: assistantId, role: "assistant", content: "", timestamp: new Date(), isLoading: true });

    setIsQuerying(true);
    try {
      const result = conversationId
        ? await refineQuery(conversationId, prompt)
        : await runQuery(prompt);

      setConversationId(result.conversation_id);
      setActiveResult(result);
      addHistory(result);

      updateMessage(assistantId, {
        isLoading: false,
        content: result.explain?.naturalExplanation ?? "Here are the results.",
        result,
      });
    } catch (err) {
      updateMessage(assistantId, {
        isLoading: false,
        role: "error",
        content: err instanceof Error ? err.message : "Something went wrong. Check that the backend is running.",
      });
    } finally {
      setIsQuerying(false);
    }
  }, [isQuerying, conversationId, addMessage, updateMessage, setConversationId, setActiveResult, addHistory, setIsQuerying]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Query Assistant</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ask in plain English</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearMessages} title="Clear conversation">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground px-6 text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Ask about your data</p>
              <p className="text-xs mt-1">Try "revenue by region in Q2 2024" or "top customers by spend"</p>
            </div>
          </div>
        ) : (
          <ChatMessageList smooth>
            {messages.map((msg) =>
              msg.isLoading ? (
                <ChatBubble key={msg.id} variant="received">
                  <ChatBubbleAvatar fallback="AI" className="bg-primary/10" />
                  <ChatBubbleMessage isLoading />
                </ChatBubble>
              ) : (
                <ChatMessage key={msg.id} message={msg} />
              )
            )}
          </ChatMessageList>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t bg-card">
        <QueryInput onSubmit={handleSubmit} isLoading={isQuerying} />
      </div>
    </div>
  );
}
