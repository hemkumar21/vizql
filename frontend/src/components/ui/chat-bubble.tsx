import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageLoading } from "@/components/ui/message-loading"

interface ChatBubbleProps { variant?: "sent" | "received"; className?: string; children: React.ReactNode }
export function ChatBubble({ variant = "received", className, children }: ChatBubbleProps) {
  return <div className={cn("flex items-start gap-2 mb-4", variant === "sent" && "flex-row-reverse", className)}>{children}</div>
}

interface ChatBubbleMessageProps { variant?: "sent" | "received"; isLoading?: boolean; className?: string; children?: React.ReactNode }
export function ChatBubbleMessage({ variant = "received", isLoading, className, children }: ChatBubbleMessageProps) {
  return (
    <div className={cn("rounded-lg p-3 max-w-[85%]", variant === "sent" ? "bg-primary text-primary-foreground" : "bg-muted", className)}>
      {isLoading ? <div className="flex items-center space-x-2"><MessageLoading /></div> : children}
    </div>
  )
}

interface ChatBubbleAvatarProps { src?: string; fallback?: string; className?: string }
export function ChatBubbleAvatar({ src, fallback = "AI", className }: ChatBubbleAvatarProps) {
  return (
    <Avatar className={cn("h-8 w-8 shrink-0", className)}>
      {src && <AvatarImage src={src} />}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  )
}

export function ChatBubbleAction({ icon, onClick, className }: { icon?: React.ReactNode; onClick?: () => void; className?: string }) {
  return <Button variant="ghost" size="icon" className={cn("h-6 w-6", className)} onClick={onClick}>{icon}</Button>
}