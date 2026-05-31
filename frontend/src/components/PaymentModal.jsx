import { Dialog } from "@headlessui/react";

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  eventTitle,
  seatCount,
  onSuccess,
}) {
  if (!isOpen) return null;

  const launchRazorPay = () => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY,
      amount: amount * 100,
      currency: "INR",

      name: "EventHub",
      description: `Booking for ${eventTitle}`,

      handler: function (response) {
        onSuccess(response);
      },

      theme: {
        color: "#f59e0b",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-[#2C241B] border border-[#6B4F3A] p-6 rounded-xl w-96 shadow-2xl">
          <Dialog.Title className="text-xl font-bold text-white mb-4">
            Confirm Payment
          </Dialog.Title>

          <div className="space-y-2 mb-6">
            <p className="text-slate-300">
              Event: {eventTitle}
            </p>

            <p className="text-slate-300">
              Seats: {seatCount}
            </p>

            <p className="text-2xl font-bold text-amber-400">
              ₹{amount}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={launchRazorPay}
              className="btn-primary flex-1"
            >
              Pay Now
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300"
            >
              Cancel
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}