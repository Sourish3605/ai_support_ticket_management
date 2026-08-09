import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  addComment,
  getTicketById,
  updateTicket,
} from "../../services/ticketService";

export default function AgentTicketDetails() {
  const { id } = useParams();

  const [ticket, setTicket] = useState(null);
  const [comment, setComment] = useState("");

  const load = () => {
    setTicket(getTicketById(id));
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!ticket) {
    return <div>Ticket not found.</div>;
  }

  const updateStatus = (status) => {
    const updated = updateTicket(
      ticket.id,
      { status }
    );

    setTicket(updated);
  };

  const sendComment = () => {
    if (!comment.trim()) return;

    const updated = addComment(
      ticket.id,
      {
        author: "Priya Kumar",
        authorRole: "Agent",
        visibility: "Public",
        message: comment,
      }
    );

    setTicket(updated);
    setComment("");
  };

  return (
    <div className="h-[calc(100vh-120px)]">

      <div className="mb-4">
        <span className="font-mono text-[#14532d]">
          {ticket.id}
        </span>

        <h1 className="text-2xl font-bold">
          {ticket.subject}
        </h1>
      </div>

      <div className="grid grid-cols-12 gap-4 h-full">

        {/* LEFT PANE */}

        <div className="col-span-4 bg-white border rounded-2xl p-5 overflow-y-auto">

          <h2 className="font-bold text-lg">
            Customer & History
          </h2>

          <div className="mt-5 space-y-4">

            <div>
              <p className="text-xs text-gray-500">
                Customer
              </p>

              <p className="font-semibold">
                {ticket.customerName}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Email
              </p>

              <p>
                {ticket.customerEmail}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Department
              </p>

              <p>
                {ticket.department}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Asset
              </p>

              <p>
                {ticket.assetTag || "Not provided"}
              </p>
            </div>

          </div>

          <hr className="my-6" />

          <h3 className="font-bold">
            Comments
          </h3>

          <div className="space-y-4 mt-4">

            {ticket.comments.map(
              (item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-3"
                >
                  <p className="font-semibold text-sm">
                    {item.author}
                  </p>

                  <p className="text-sm mt-1">
                    {item.message}
                  </p>
                </div>
              )
            )}

          </div>

          <textarea
            value={comment}
            onChange={(e) =>
              setComment(e.target.value)
            }
            rows={4}
            className="w-full border rounded-lg p-3 mt-5"
            placeholder="Write public comment..."
          />

          <button
            onClick={sendComment}
            className="w-full mt-2 bg-[#14532d] text-white py-2 rounded-lg"
          >
            Send Comment
          </button>

        </div>

        {/* RIGHT SIDE */}

        <div className="col-span-8 space-y-4 overflow-y-auto">

          {/* AI CLASSIFICATION */}

          <section className="bg-white border rounded-2xl p-5">

            <div className="flex justify-between">

              <div>
                <h2 className="font-bold text-lg">
                  AI Classification
                </h2>

                <p className="text-sm text-gray-500">
                  Automated ticket understanding
                </p>
              </div>

              <span className="px-3 py-1 bg-[#eef4ef] text-[#14532d] rounded-full text-sm">
                {ticket.ai.classificationPath}
              </span>

            </div>

            <div className="grid grid-cols-3 gap-4 mt-5">

              <div>
                <p className="text-xs text-gray-500">
                  Category
                </p>
                <p className="font-bold">
                  {ticket.category}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Confidence
                </p>
                <p className="font-bold">
                  {Math.round(
                    ticket.ai.categoryConfidence *
                      100
                  )}
                  %
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Severity
                </p>
                <p className="font-bold">
                  {ticket.ai.severity}
                </p>
              </div>

            </div>

            <button className="mt-5 border border-[#14532d] text-[#14532d] px-4 py-2 rounded-lg">
              Reclassify
            </button>

          </section>

          {/* AI RESOLUTION */}

          <section className="bg-white border rounded-2xl p-5">

            <h2 className="font-bold text-lg">
              AI Resolution
            </h2>

            <div className="space-y-3 mt-5">

              {ticket.ai.suggestedResolution.map(
                (step, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-start"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#eef4ef] flex items-center justify-center text-sm">
                      {index + 1}
                    </span>

                    <p>{step}</p>
                  </div>
                )
              )}

            </div>

            <div className="flex gap-3 mt-6">

              <button className="bg-[#14532d] text-white px-4 py-2 rounded-lg">
                Accept
              </button>

              <button className="border px-4 py-2 rounded-lg">
                Edit & Send
              </button>

              <button className="border px-4 py-2 rounded-lg">
                Escalate
              </button>

              <button
                onClick={() =>
                  updateStatus("Resolved")
                }
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Resolve
              </button>

            </div>

          </section>

          {/* STATUS */}

          <section className="bg-white border rounded-2xl p-5">

            <h2 className="font-bold">
              Ticket Status
            </h2>

            <div className="flex gap-3 mt-4">

              {[
                "Open",
                "In Progress",
                "Pending",
                "Resolved",
                "Closed",
              ].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    updateStatus(status)
                  }
                  className={`px-4 py-2 rounded-lg border ${
                    ticket.status === status
                      ? "bg-[#14532d] text-white"
                      : ""
                  }`}
                >
                  {status}
                </button>
              ))}

            </div>

          </section>

        </div>

      </div>

    </div>
  );
}