import React from 'react';
import { useLocation } from 'react-router-dom';

// Regular expression to detect mobile devices via user agent
const deviceMobileRegex = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/;

/**
 * DeviceGuard Component
 * - On landing page ('/'): shows a warning banner for mobile users but allows them to view the page.
 * - On all other routes: blocks mobile users with a message directing them back to the landing page.
 */
const DeviceGuard = ({ children }) => {
  const location = useLocation();
  const isMobile = typeof navigator !== 'undefined' && deviceMobileRegex.test(navigator.userAgent);

  // Block access for mobile devices on all routes except the landing page
  if (isMobile && location.pathname !== '/') {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '100px auto',
        padding: '20px',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
      }}>
        <h1 style={{ color: '#333', marginBottom: '16px' }}>Not Supported on Mobile Devices</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Tigertype is currently not supported on mobile devices. Please switch to a desktop device to access this application.
        </p>
        <a
          href="/"
          style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}
        >
          Go to Landing Page
        </a>
      </div>
    );
  }

  // On the landing page: show a warning banner but still render the content
  return (
    <>
      {isMobile && location.pathname === '/' && (
        <div style={{
          backgroundColor: '#ffeb3b',
          padding: '12px',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
        }}>
          <span style={{ fontWeight: 'bold', color: '#333' }}>Warning:</span> Tigertype is not fully supported on mobile devices. You can view this landing page, but other pages will not be accessible.
        </div>
      )}
      {children}
    </>
  );
};

export default DeviceGuard; 