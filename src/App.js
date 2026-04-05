import React, { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

function App() {
  const [activePage, setActivePage] = useState(
    localStorage.getItem("activePage") || "dashboard",
  ); // save last visited page
  const [command, setCommand] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [jarvisLog, setJarvisLog] = useState([]);
  const [patients, setPatients] = useState(
    JSON.parse(localStorage.getItem("patients")) || [],
  );
  const [invoices, setInvoices] = useState(
    JSON.parse(localStorage.getItem("invoices")) || [],
  );

  // Conversation state
  const [awaitingInput, setAwaitingInput] = useState(null); // { type, id, field }

  useEffect(() => {
    setJarvisLog([
      {
        role: "jarvis",
        text: "Mini ChatGPT is online. You can add, edit, delete patients and invoices by voice or text.",
      },
    ]);
  }, []);

  // Text-to-speech
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  };

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      const msg =
        e.error === "not-allowed"
          ? "Mic access blocked."
          : "Voice recognition stopped.";
      addJarvisLog(msg);
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setCommand(transcript);
      if (transcript.trim()) runCommand(transcript);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = async () => {
    if (!recognitionRef.current) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current.start();
    } catch {
      addJarvisLog("Microphone access failed.");
    }
  };

  const addJarvisLog = (text) => {
    setJarvisLog((prev) => [...prev, { role: "jarvis", text }]);
    speak(text);
  };

  // Update local storage
  useEffect(() => {
    localStorage.setItem("patients", JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem("invoices", JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem("activePage", activePage);
  }, [activePage]);

  const runCommand = (text) => {
    if (!text.trim()) return;
    addJarvisLog(text);

    const lower = text.toLowerCase();

    // Navigation commands
    if (lower.includes("dashboard")) setActivePage("dashboard");
    else if (lower.includes("patients")) setActivePage("patients");
    else if (lower.includes("invoices")) setActivePage("invoices");
    // Add commands
    else if (
      lower.includes("add new patient") ||
      lower.includes("new patient")
    ) {
      setAwaitingInput({ type: "new_patient" });
      addJarvisLog("What is the patient's name?");
    } else if (
      lower.includes("add new invoice") ||
      lower.includes("new invoice")
    ) {
      setAwaitingInput({ type: "new_invoice" });
      addJarvisLog("What is the invoice title?");
    }
    // Edit & Delete commands
    else if (lower.includes("edit patient")) {
      const id = lower.split("edit patient ")[1];
      if (patients.find((p) => p.id.toLowerCase() === id)) {
        setAwaitingInput({ type: "edit_patient", id });
        addJarvisLog(
          `Editing patient ${id}. Say 'name: new name' or 'status: new status'`,
        );
      } else addJarvisLog("Patient ID not found.");
    } else if (lower.includes("delete patient")) {
      const id = lower.split("delete patient ")[1];
      setPatients((prev) => prev.filter((p) => p.id.toLowerCase() !== id));
      addJarvisLog(`Patient ${id} deleted.`);
    } else if (lower.includes("edit invoice")) {
      const id = lower.split("edit invoice ")[1];
      if (invoices.find((i) => i.id.toLowerCase() === id)) {
        setAwaitingInput({ type: "edit_invoice", id });
        addJarvisLog(
          `Editing invoice ${id}. Say 'title: new title' or 'amount: new amount'`,
        );
      } else addJarvisLog("Invoice ID not found.");
    } else if (lower.includes("delete invoice")) {
      const id = lower.split("delete invoice ")[1];
      setInvoices((prev) => prev.filter((i) => i.id.toLowerCase() !== id));
      addJarvisLog(`Invoice ${id} deleted.`);
    }

    // Input awaited for add/edit
    else if (awaitingInput) {
      if (awaitingInput.type === "new_patient") {
        const newPatient = {
          id: `PT-${patients.length + 1}`,
          name: text,
          status: "Active",
        };
        setPatients((prev) => [...prev, newPatient]);
        addJarvisLog(`Patient ${text} added.`);
        setAwaitingInput(null);
      } else if (awaitingInput.type === "new_invoice") {
        const newInvoice = {
          id: `INV-${invoices.length + 1}`,
          title: text,
          amount: 0,
        };
        setInvoices((prev) => [...prev, newInvoice]);
        addJarvisLog(`Invoice ${text} added.`);
        setAwaitingInput(null);
      } else if (awaitingInput.type === "edit_patient") {
        const [field, ...rest] = text.split(":");
        setPatients((prev) =>
          prev.map((p) =>
            p.id === awaitingInput.id
              ? { ...p, [field.trim()]: rest.join(":").trim() }
              : p,
          ),
        );
        addJarvisLog(`Patient ${awaitingInput.id} updated.`);
        setAwaitingInput(null);
      } else if (awaitingInput.type === "edit_invoice") {
        const [field, ...rest] = text.split(":");
        setInvoices((prev) =>
          prev.map((i) =>
            i.id === awaitingInput.id
              ? {
                  ...i,
                  [field.trim()]:
                    field.trim() === "amount"
                      ? parseFloat(rest.join(":"))
                      : rest.join(":").trim(),
                }
              : i,
          ),
        );
        addJarvisLog(`Invoice ${awaitingInput.id} updated.`);
        setAwaitingInput(null);
      }
    } else {
      addJarvisLog(
        "Command not recognized. Try adding, editing, or deleting patients/invoices.",
      );
    }

    setCommand("");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-5">
      <div className="sticky top-0 bg-cyan-600 text-white text-center py-2 mb-4">
        Mini ChatGPT Offline - Voice & Text Jarvis
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          className="border p-2 flex-1 rounded"
          placeholder="Type or speak to Jarvis..."
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runCommand(command);
          }}
        />
        <button
          className="bg-cyan-600 text-white px-4 rounded"
          onClick={() => runCommand(command)}
        >
          Send
        </button>
        <button
          className="bg-green-600 text-white px-4 rounded flex items-center gap-1"
          onClick={startListening}
        >
          <Mic /> {isListening ? "Listening..." : "Start Voice"}
        </button>
      </div>

      {/* Pages */}
      {activePage === "dashboard" && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-2">Dashboard</h2>
          <p>
            Use Jarvis to add, edit, delete patients and invoices via voice or
            text.
          </p>
        </div>
      )}

      {activePage === "patients" && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-2">Patients</h2>
          <button
            className="bg-green-600 text-white px-3 py-1 rounded mb-2"
            onClick={() => runCommand("add new patient")}
          >
            Add New Patient
          </button>
          {patients.length === 0 ? (
            <p>No patients yet.</p>
          ) : (
            patients.map((p) => (
              <div key={p.id} className="flex justify-between border-b py-2">
                <span>{p.name}</span>
                <span>{p.status}</span>
                <div className="flex gap-1">
                  <button
                    className="bg-blue-500 text-white px-2 rounded"
                    onClick={() => runCommand(`edit patient ${p.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-500 text-white px-2 rounded"
                    onClick={() => runCommand(`delete patient ${p.id}`)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activePage === "invoices" && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-2">Invoices</h2>
          <button
            className="bg-green-600 text-white px-3 py-1 rounded mb-2"
            onClick={() => runCommand("add new invoice")}
          >
            Add New Invoice
          </button>
          {invoices.length === 0 ? (
            <p>No invoices yet.</p>
          ) : (
            invoices.map((i) => (
              <div key={i.id} className="flex justify-between border-b py-2">
                <span>{i.title}</span>
                <span>${i.amount}</span>
                <div className="flex gap-1">
                  <button
                    className="bg-blue-500 text-white px-2 rounded"
                    onClick={() => runCommand(`edit invoice ${i.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-500 text-white px-2 rounded"
                    onClick={() => runCommand(`delete invoice ${i.id}`)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Jarvis log */}
      <div className="mt-4">
        {jarvisLog.map((msg, i) => (
          <div
            key={i}
            className={`p-2 mb-1 rounded ${msg.role === "jarvis" ? "bg-white" : "bg-cyan-100 ml-auto"}`}
          >
            {msg.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
