import { useEffect, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import Loader from '../components/Loader';
import { getAiResponses } from '../services/ticketService';

const AiAssistantPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      const data = await getAiResponses();
      setMessages(data);
      setLoading(false);
    };

    loadMessages();
  }, []);

  const handleSend = (event) => {
    event.preventDefault();
    if (!input.trim()) return;
    setMessages((current) => [...current, { id: Date.now(), role: 'user', content: input }]);
    setInput('');
    setTimeout(() => {
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', content: 'I can help draft a response or prioritize this request based on your current queue.' }]);
    }, 600);
  };

  if (loading) {
    return <Loader label="Preparing your AI assistant" />;
  }

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">AI copilot</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Support Assistant</h2>
      </div>
      <div className="flex h-[520px] flex-col rounded-[28px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex-1 space-y-3 overflow-y-auto p-2">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
                {message.content}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask the AI assistant..." className="flex-1 border-none outline-none" />
          <button type="submit" className="rounded-2xl bg-indigo-600 p-3 text-white">
            <FiSend size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiAssistantPage;
