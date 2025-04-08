import React from 'react';
import './Modal.css';

const Modal = ({ isOpen, title, message, buttonText, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{title}</h2>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="modal-button" onClick={onClose}>
            {buttonText || "I understand"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal; 