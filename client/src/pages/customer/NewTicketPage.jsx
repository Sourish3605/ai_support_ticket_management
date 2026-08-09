import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { createTicket } from "../../services/ticketService";

const initialForm = {
  subject: "",
  description: "",
  category: "",
  affectedSystem: "",
  startedWhen: "",

  scope: "Just me",
  workBlocked: false,
  urgency: "Medium",
  workaround: "No",

  department: "",
  location: "",
  assetTag: "",

  contactPreference: "Email",
  bestTime: "",

  attachments: [],
};

export default function NewTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);

  const [classification, setClassification] =
    useState("");

  const [error, setError] = useState("");

  const update = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // Auto save draft
  useEffect(() => {
    localStorage.setItem(
      "supportpilot_ticket_draft",
      JSON.stringify(form)
    );
  }, [form]);

  // Restore draft
  useEffect(() => {
    const draft = localStorage.getItem(
      "supportpilot_ticket_draft"
    );

    if (draft) {
      try {
        setForm(JSON.parse(draft));
      } catch {
        console.log("Invalid draft");
      }
    }
  }, []);

  // Simple live classification hint
  useEffect(() => {
    const timer = setTimeout(() => {
      const text =
        `${form.subject} ${form.description}`.toLowerCase();

      if (
        text.includes("password") ||
        text.includes("login")
      ) {
        setClassification(
          "AI hint: This looks like an Account issue."
        );
      } else if (
        text.includes("vpn") ||
        text.includes("network") ||
        text.includes("server")
      ) {
        setClassification(
          "AI hint: This looks like a Technical issue."
        );
      } else if (
        text.includes("billing") ||
        text.includes("invoice")
      ) {
        setClassification(
          "AI hint: This looks like a Billing issue."
        );
      } else {
        setClassification("");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.subject, form.description]);

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");

    if (!form.subject.trim()) {
      setError("Please enter a subject.");
      return;
    }

    if (form.description.trim().length < 20) {
      setError(
        "Description must contain at least 20 characters."
      );
      return;
    }

    try {
      const ticket = createTicket(
        form,
        user
      );

      localStorage.removeItem(
        "supportpilot_ticket_draft"
      );

      // Immediately go to the created ticket
      navigate(
        `/portal/tickets/${ticket.id}`
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1c2430]">
          Create a Support Ticket
        </h1>

        <p className="text-[#4b5563] mt-2">
          Tell us what you need help with.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {classification && (
        <div className="mb-6 bg-[#eef4ef] border border-[#dfe5e1] p-4 rounded-lg">
          🤖 {classification}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-8"
      >

        {/* ISSUE */}

        <section className="bg-white border border-[#dfe5e1] rounded-2xl p-6">

          <h2 className="text-xl font-bold mb-5">
            1. Issue
          </h2>

          <div className="space-y-5">

            <div>
              <label className="block font-medium mb-2">
                Subject
              </label>

              <input
                value={form.subject}
                onChange={(e) =>
                  update(
                    "subject",
                    e.target.value
                  )
                }
                className="w-full border rounded-lg px-4 py-3"
                placeholder="Briefly describe your issue"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">
                Description
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  update(
                    "description",
                    e.target.value
                  )
                }
                rows={6}
                className="w-full border rounded-lg px-4 py-3"
                placeholder="Explain what happened..."
              />

              <p className="text-xs text-gray-500 mt-1">
                {form.description.length}/20 minimum
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">

              <div>
                <label className="block font-medium mb-2">
                  Category Hint
                </label>

                <select
                  value={form.category}
                  onChange={(e) =>
                    update(
                      "category",
                      e.target.value
                    )
                  }
                  className="w-full border rounded-lg px-4 py-3"
                >
                  <option value="">
                    Let AI classify
                  </option>
                  <option>Technical</option>
                  <option>Account</option>
                  <option>Billing</option>
                  <option>General</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-2">
                  Affected System
                </label>

                <input
                  value={form.affectedSystem}
                  onChange={(e) =>
                    update(
                      "affectedSystem",
                      e.target.value
                    )
                  }
                  className="w-full border rounded-lg px-4 py-3"
                  placeholder="e.g. Email, VPN, ERP"
                />
              </div>

            </div>

            <div>
              <label className="block font-medium mb-2">
                Started When
              </label>

              <select
                value={form.startedWhen}
                onChange={(e) =>
                  update(
                    "startedWhen",
                    e.target.value
                  )
                }
                className="w-full border rounded-lg px-4 py-3"
              >
                <option value="">
                  Select
                </option>
                <option>Just now</option>
                <option>Today</option>
                <option>Yesterday</option>
                <option>This week</option>
                <option>More than a week ago</option>
              </select>
            </div>

          </div>
        </section>

        {/* IMPACT */}

        <section className="bg-white border border-[#dfe5e1] rounded-2xl p-6">

          <h2 className="text-xl font-bold mb-5">
            2. Impact
          </h2>

          <div className="space-y-5">

            <div>
              <label className="block font-medium mb-3">
                Scope
              </label>

              <div className="grid md:grid-cols-4 gap-3">

                {[
                  "Just me",
                  "My team",
                  "My department",
                  "Whole org",
                ].map((item) => (
                  <label
                    key={item}
                    className={`border rounded-lg p-3 cursor-pointer ${
                      form.scope === item
                        ? "border-[#14532d] bg-[#eef4ef]"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={
                        form.scope === item
                      }
                      onChange={() =>
                        update(
                          "scope",
                          item
                        )
                      }
                      className="mr-2"
                    />

                    {item}
                  </label>
                ))}

              </div>
            </div>

            <label className="flex items-center justify-between border rounded-lg p-4">

              <div>
                <p className="font-medium">
                  Is your work blocked?
                </p>

                <p className="text-sm text-gray-500">
                  Is this preventing you from working?
                </p>
              </div>

              <input
                type="checkbox"
                checked={form.workBlocked}
                onChange={(e) =>
                  update(
                    "workBlocked",
                    e.target.checked
                  )
                }
                className="w-5 h-5"
              />

            </label>

            <div className="grid md:grid-cols-2 gap-5">

              <div>
                <label className="block font-medium mb-2">
                  Urgency
                </label>

                <select
                  value={form.urgency}
                  onChange={(e) =>
                    update(
                      "urgency",
                      e.target.value
                    )
                  }
                  className="w-full border rounded-lg px-4 py-3"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-2">
                  Workaround available?
                </label>

                <select
                  value={form.workaround}
                  onChange={(e) =>
                    update(
                      "workaround",
                      e.target.value
                    )
                  }
                  className="w-full border rounded-lg px-4 py-3"
                >
                  <option>No</option>
                  <option>Yes</option>
                  <option>Partially</option>
                </select>
              </div>

            </div>
          </div>
        </section>

        {/* CONTEXT */}

        <section className="bg-white border border-[#dfe5e1] rounded-2xl p-6">

          <h2 className="text-xl font-bold mb-5">
            3. Context
          </h2>

          <div className="grid md:grid-cols-2 gap-5">

            <div>
              <label className="block font-medium mb-2">
                Department
              </label>

              <input
                value={
                  form.department ||
                  user?.department ||
                  ""
                }
                onChange={(e) =>
                  update(
                    "department",
                    e.target.value
                  )
                }
                className="w-full border rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">
                Location / Site
              </label>

              <input
                value={form.location}
                onChange={(e) =>
                  update(
                    "location",
                    e.target.value
                  )
                }
                className="w-full border rounded-lg px-4 py-3"
                placeholder="Chennai Office"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">
                Asset Tag
              </label>

              <input
                value={form.assetTag}
                onChange={(e) =>
                  update(
                    "assetTag",
                    e.target.value
                  )
                }
                className="w-full border rounded-lg px-4 py-3"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">
                Contact Preference
              </label>

              <select
                value={
                  form.contactPreference
                }
                onChange={(e) =>
                  update(
                    "contactPreference",
                    e.target.value
                  )
                }
                className="w-full border rounded-lg px-4 py-3"
              >
                <option>Email</option>
                <option>Phone</option>
                <option>Chat</option>
              </select>
            </div>

          </div>

          <div className="mt-5">
            <label className="block font-medium mb-2">
              Best time to contact
            </label>

            <input
              value={form.bestTime}
              onChange={(e) =>
                update(
                  "bestTime",
                  e.target.value
                )
              }
              className="w-full border rounded-lg px-4 py-3"
              placeholder="e.g. 10 AM - 1 PM"
            />
          </div>
        </section>

        <button
          type="submit"
          className="w-full bg-[#14532d] hover:bg-[#0f2b1d] text-white py-4 rounded-xl font-semibold"
        >
          Submit Ticket
        </button>

      </form>
    </div>
  );
}