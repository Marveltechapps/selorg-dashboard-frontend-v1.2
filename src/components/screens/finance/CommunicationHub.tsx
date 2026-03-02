import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Paperclip } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  attachments?: { name: string; url: string }[];
}

interface Thread {
  id: string;
  title: string;
  vendor?: string;
  lastMessage: string;
  lastMessageTime: string;
  messages: Message[];
}

export function CommunicationHub() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  
  const [messageInput, setMessageInput] = useState('');
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadVendor, setNewThreadVendor] = useState('');
  const [newThreadMessage, setNewThreadMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const selectedThread = threads.find(t => t.id === selectedThreadId);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedThread?.messages]);
  
  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedThreadId) return;
    
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      text: messageInput,
      sender: 'Me',
      timestamp: new Date().toISOString()
    };
    
    setThreads(prev => prev.map(thread => {
      if (thread.id === selectedThreadId) {
        return {
          ...thread,
          messages: [...thread.messages, newMessage],
          lastMessage: messageInput,
          lastMessageTime: newMessage.timestamp
        };
      }
      return thread;
    }));
    
    setMessageInput('');
  };
  
  const handleNewThread = () => {
    if (!newThreadTitle.trim() || !newThreadMessage.trim()) {
      toast.error('Please fill in title and message');
      return;
    }
    
    const newThread: Thread = {
      id: `thread_${Date.now()}`,
      title: newThreadTitle,
      vendor: newThreadVendor || undefined,
      lastMessage: newThreadMessage,
      lastMessageTime: new Date().toISOString(),
      messages: [
        {
          id: `msg_${Date.now()}`,
          text: newThreadMessage,
          sender: 'Me',
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    setThreads(prev => [newThread, ...prev]);
    setSelectedThreadId(newThread.id);
    setShowNewThreadModal(false);
    setNewThreadTitle('');
    setNewThreadVendor('');
    setNewThreadMessage('');
    toast.success('New thread created');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Communication & Collaboration</h1>
          <p className="text-[#757575] text-sm">Internal notes, vendor chats, and escalation logs</p>
        </div>
        <button 
          className="px-4 py-2 bg-[#14B8A6] text-white font-medium rounded-lg hover:bg-[#0D9488] flex items-center gap-2"
          onClick={() => setShowNewThreadModal(true)}
        >
          <MessageSquare size={16} />
          New Thread
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Chat List */}
          <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA]">
                  <h3 className="font-bold text-[#212121]">Recent Discussions</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                  {threads.length === 0 ? (
                    <div className="p-8 text-center text-[#757575]">
                      No communication threads
                    </div>
                  ) : (
                  threads.map(thread => (
                    <div 
                      key={thread.id}
                      className={`p-4 border-b border-[#E0E0E0] hover:bg-[#F5F5F5] cursor-pointer ${selectedThreadId === thread.id ? 'bg-teal-50' : ''}`}
                      onClick={() => setSelectedThreadId(thread.id)}
                    >
                        <div className="flex justify-between mb-1">
                            <span className="font-bold text-[#212121]">{thread.title}</span>
                            <span className="text-xs text-[#757575]">
                              {new Date(thread.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <p className="text-sm text-[#616161] truncate">{thread.lastMessage}</p>
                    </div>
                  ))
                  )}
              </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2 bg-white border border-[#E0E0E0] rounded-xl overflow-hidden flex flex-col shadow-sm">
              {selectedThread ? (
                <>
                  <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-[#212121]">{selectedThread.title}</h3>
                          {selectedThread.vendor && (
                            <p className="text-xs text-[#14B8A6]">Vendor: {selectedThread.vendor}</p>
                          )}
                      </div>
                  </div>
                  
                  <div className="flex-1 bg-gray-50 p-4 space-y-4 overflow-y-auto">
                      {selectedThread.messages.map(msg => (
                        <div 
                          key={msg.id}
                          className={`flex ${msg.sender === 'Me' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`p-3 rounded-lg border max-w-[80%] shadow-sm ${
                              msg.sender === 'Me' 
                                ? 'bg-[#F0FDFA] border-[#14B8A6]/20' 
                                : 'bg-white border-[#E0E0E0]'
                            }`}>
                                <p className="text-sm text-[#212121]">{msg.text}</p>
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="flex flex-col gap-2 mt-2">
                                    {msg.attachments.map((att, idx) => (
                                      <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border border-[#E0E0E0]">
                                        <Paperclip size={14} className="text-[#757575]" />
                                        <span className="text-xs font-medium">{att.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <span className={`text-[10px] mt-1 block ${
                                  msg.sender === 'Me' ? 'text-[#14B8A6]' : 'text-[#9E9E9E]'
                                }`}>
                                  {msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-[#E0E0E0] bg-white flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Type a note..." 
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="flex-1 h-10 px-3 rounded-lg border border-[#E0E0E0] focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6] outline-none"
                      />
                      <button 
                        className="bg-[#14B8A6] text-white p-2 rounded-lg hover:bg-[#0D9488]"
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                      >
                          <Send size={20} />
                      </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#757575]">
                  <p>{threads.length === 0 ? 'No communication threads' : 'Select a thread to start chatting'}</p>
                </div>
              )}
          </div>
      </div>
      
      <Dialog open={showNewThreadModal} onOpenChange={setShowNewThreadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Thread</DialogTitle>
            <DialogDescription>Create a new communication thread</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="thread-title">Title</Label>
              <Input
                id="thread-title"
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
                placeholder="e.g. Invoice #9921 Dispute"
              />
            </div>
            <div>
              <Label htmlFor="thread-vendor">Vendor (Optional)</Label>
              <Input
                id="thread-vendor"
                value={newThreadVendor}
                onChange={(e) => setNewThreadVendor(e.target.value)}
                placeholder="e.g. Fresh Farms Supplies"
              />
            </div>
            <div>
              <Label htmlFor="thread-message">Initial Message</Label>
              <Textarea
                id="thread-message"
                value={newThreadMessage}
                onChange={(e) => setNewThreadMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewThreadModal(false)}>Cancel</Button>
            <Button 
              onClick={handleNewThread}
              className="bg-[#14B8A6] hover:bg-[#0D9488]"
              disabled={!newThreadTitle.trim() || !newThreadMessage.trim()}
            >
              Create Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
