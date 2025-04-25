import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

// Context to hold anchor refs
const AnchorContext = createContext(null);

export const AnchorProvider = ({ children }) => {
  // Keep anchors in state so consumers re-render on change
  const [anchors, setAnchors] = React.useState(new Map());

  const register = useCallback((id, ref) => {
    if (!id || !ref) return;
    setAnchors(prev => {
      if (prev.get(id) === ref) return prev;
      const next = new Map(prev);
      next.set(id, ref);
      return next;
    });
  }, []);

  const unregister = useCallback((id) => {
    setAnchors(prev => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <AnchorContext.Provider value={{ anchors, register, unregister }}>
      {children}
    </AnchorContext.Provider>
  );
};

// Hook to access anchor context
export const useAnchorContext = () => {
  const ctx = useContext(AnchorContext);
  if (!ctx) throw new Error('useAnchorContext must be used within AnchorProvider');
  return ctx;
};

// Anchor component wraps any element to expose it to the tutorial
const TutorialAnchor = ({ anchorId, children }) => {
  const { register, unregister } = useAnchorContext();
  const ref = useRef(null);

  useEffect(() => {
    register(anchorId, ref.current);
    return () => unregister(anchorId);
  }, [anchorId, register, unregister]);

  // Support a single element or multiple/fragment children
  if (React.isValidElement(children) && children.type !== React.Fragment && !Array.isArray(children)) {
    return React.cloneElement(children, { ref, 'data-tutorial-id': anchorId });
  }
  // If multiple children, wrap them in a span (cannot attach ref to fragment)
  return (
    <span ref={ref} data-tutorial-id={anchorId} style={{ display: 'contents' }}>
      {children}
    </span>
  );
};

export default TutorialAnchor; 