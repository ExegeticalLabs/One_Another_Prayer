import React from "react";
import { motion, AnimatePresence } from "motion/react";

export function Modal({ children, onClose, center }: { children: React.ReactNode, onClose: () => void, center?: boolean }) {
  return (
    <AnimatePresence>
      <motion.div 
        className={`modal ${center ? "center" : ""}`} 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div 
          className={`sheet ${center ? "sheetCenter" : ""}`} 
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          initial={center ? { opacity: 0, scale: 0.9 } : { y: "100%" }}
          animate={center ? { opacity: 1, scale: 1 } : { y: 0 }}
          exit={center ? { opacity: 0, scale: 0.9 } : { y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          drag={center ? false : "y"}
          dragConstraints={center ? undefined : { top: 0 }}
          dragElastic={center ? undefined : 0.2}
          onDragEnd={!center ? (event, info) => {
            if (info.offset.y > 100 || info.velocity.y > 500) {
              onClose();
            }
          } : undefined}
        >
          {!center && (
            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '12px auto 0' }} />
          )}
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
