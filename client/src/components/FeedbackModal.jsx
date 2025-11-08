import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import './FeedbackModal.css';
import { useAuth } from '../context/AuthContext';

const CATEGORY_OPTIONS = [
  { value: 'feedback', label: 'General feedback' },
  { value: 'bug', label: 'Report a bug' },
  { value: 'idea', label: 'Feature request' },
  { value: 'other', label: 'Something else' }
];

function FeedbackModal({ isOpen, onClose }) {
  const { authenticated, user } = useAuth();
  const [category, setCategory] = useState('feedback');
  const [message, setMessage] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategory('feedback');
      setMessage('');
      setError('');
      setSubmitted(false);
      if (authenticated && user?.netid) {
        setContactInfo(`${user.netid}@princeton.edu`);
      } else {
        setContactInfo('');
      }
    }
  }, [isOpen, authenticated, user]);

  const closeIfAllowed = () => {
    if (!submitting) {
      onClose();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 10) {
      setError('Please include at least a few details so we can help.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: trimmedMessage,
          contactInfo: contactInfo.trim() || null,
          pagePath: typeof window !== 'undefined' ? window.location.pathname : null
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to send feedback right now.');
      }

      setSubmitted(true);
      setMessage('');
    } catch (err) {
      setError(err.message || 'Unable to send feedback right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeIfAllowed}
      title={submitted ? 'Thanks for your feedback!' : 'Send Feedback'}
      showCloseButton
      isLarge={!submitted}
    >
      {submitted ? (
        <div className="feedback-success">
          <p>We appreciate you taking the time to help improve TigerType.</p>
          <button
            type="button"
            className="feedback-primary-button"
            onClick={closeIfAllowed}
          >
            Close
          </button>
        </div>
      ) : (
        <form className="feedback-form" onSubmit={handleSubmit}>
          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={submitting}
            >
              {CATEGORY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Describe what happened
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={submitting}
              rows={8}
              maxLength={2000}
              placeholder="Share details, steps to reproduce, or anything else we should know."
            />
            <span className="feedback-hint">{message.trim().length}/2000 characters</span>
          </label>

          <label>
            Contact (optional)
            <input
              type="email"
              value={contactInfo}
              onChange={(event) => setContactInfo(event.target.value)}
              disabled={submitting}
              placeholder="we'll follow up here if we need more info :)"
            />
          </label>

          {error && <p className="feedback-error">{error}</p>}

          <div className="feedback-actions">
            <button
              type="button"
              className="feedback-secondary-button"
              onClick={closeIfAllowed}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="feedback-primary-button"
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

FeedbackModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default FeedbackModal;
