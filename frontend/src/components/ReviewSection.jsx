import { useState } from "react";

export default function ReviewSection({
  reviews,
  onSubmit,
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (!comment.trim()) return;

    onSubmit({
      rating,
      comment,
    });

    setComment("");
    setRating(5);
  };

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-amber-100 mb-6">
        Reviews
      </h2>

      {/* Existing reviews */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-slate-400">
            No reviews yet.
          </p>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-[#2C241B] border border-[#6B4F3A] rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-amber-100">
                  {review.user.name || "Anonymous User"}
                </p>
              
                <div className="text-amber-400">
                  {"★".repeat(review.rating)}
                </div>
              </div>

              <p className="text-ink-200 mt-2">
                {review.comment}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add review form */}
      <div className="mt-8 bg-[#2C241B] border border-[#6B4F3A] rounded-xl p-5">
        <h3 className="text-lg font-semibold text-amber-100 mb-4">
          Leave a Review
        </h3>

        <select
          value={rating}
          onChange={(e) =>
            setRating(Number(e.target.value))
          }
          className="w-full p-2 rounded-lg bg-ink-800 text-ink-100 mb-3"
        >
          <option value={5}>★★★★★</option>
          <option value={4}>★★★★☆</option>
          <option value={3}>★★★☆☆</option>
          <option value={2}>★★☆☆☆</option>
          <option value={1}>★☆☆☆☆</option>
        </select>

        <textarea
          value={comment}
          onChange={(e) =>
            setComment(e.target.value)
          }
          placeholder="Share your experience..."
          className="w-full rounded-lg bg-ink-800 text-ink-200 p-3 min-h-[120px]"
        />

        <button
          onClick={handleSubmit}
          className="mt-4 bg-[#8B5E3C] hover:bg-[#A06D45] text-ink-200 px-4 py-2 rounded-lg"
        >
          Submit Review
        </button>
      </div>
    </div>
  );
}
