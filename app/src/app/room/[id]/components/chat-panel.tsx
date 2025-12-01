'use client'

import React, { useEffect, useState } from 'react'
import { X, Send, MoreVertical } from 'lucide-react'
import Image from 'next/image'

interface Message {
    id: number
    senderId: number
    senderName: string
    senderImage: string
    text: string
    timestamp: string
}

interface ChatPanelProps {
    messages: Message[]
    isOpen: boolean
    onClose: () => void
}

export function ChatPanel({ messages, isOpen, onClose }: ChatPanelProps) {
    const [messagesState, setMessagesState] = useState<Message[]>([...messages])
    const [newMessage, setNewMessage] = useState('')

    const handleSendMessage = () => {
        if (newMessage.trim()) {
            const message = {
                id: messages.length + 1,
                senderId: 1,
                senderName: 'You',
                senderImage:
                    'https://images.unsplash.com/photo-1672685667592-0392f458f46f?w=100',
                text: newMessage,
                timestamp: new Date().toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                }),
            }
            console.log('Message sent:', newMessage)
            setMessagesState([...messagesState, message])
            setNewMessage('')
        }
    }

    useEffect(() => {
        setMessagesState([...messages])
    }, [messages])

    if (!isOpen) return null

    return (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-gray-900">Messages</h2>
                <button
                    onClick={() => {
                        console.log('Chat panel closed')
                        onClose()
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Close chat panel"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                        <Image
                            src={message.senderImage}
                            alt={message.senderName}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                                <span className="text-gray-900">
                                    {message.senderName}
                                </span>
                                <span className="text-gray-500 text-xs">
                                    {message.timestamp}
                                </span>
                            </div>
                            <p className="text-gray-700 mt-1">{message.text}</p>
                        </div>
                        <button
                            onClick={() =>
                                console.log(
                                    `More options for message: ${message.id}`
                                )
                            }
                            className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Message input */}
            <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSendMessage()
                            }
                        }}
                        placeholder="Send a message to everyone"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
