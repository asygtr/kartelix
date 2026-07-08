export const iosEase = [0.22, 1, 0.36, 1];
export const defaultEase = iosEase;

export const springSoft = {
  type: 'spring',
  stiffness: 430,
  damping: 40,
  mass: 0.86,
};

export const defaultSpring = {
  type: 'spring',
  stiffness: 420,
  damping: 38,
  mass: 0.86,
};

export const pageTransition = {
  type: 'tween',
  duration: 0.32,
  ease: iosEase,
};

export const sheetTransition = {
  type: 'spring',
  stiffness: 540,
  damping: 44,
  mass: 0.82,
};

export const navIndicatorTransition = {
  type: 'spring',
  stiffness: 500,
  damping: 36,
  mass: 0.7,
};

export const tapMotion = {
  scale: 0.94,
  transition: { duration: 0.08, ease: iosEase },
};

export const navTapMotion = {
  scale: 0.96,
  transition: {
    duration: 0.08,
    ease: iosEase,
  },
};

export const chromeSpring = {
  type: 'spring',
  stiffness: 480,
  damping: 32,
  mass: 0.72,
  restDelta: 0.4,
  restSpeed: 0.6,
};

// stagger config for list items
export const listContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const listItemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: iosEase } },
};

export const routeVariants = {
  enter: ({ direction = 1, isDesktop = false } = {}) => {
    if (isDesktop) return { x: direction > 0 ? 22 : -22, opacity: 0, filter: 'blur(0.6px)' };
    return { x: direction > 0 ? '100%' : '-100%', opacity: 1 };
  },
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: ({ direction = 1, isDesktop = false } = {}) => {
    if (isDesktop) return { x: direction > 0 ? -16 : 16, opacity: 0, filter: 'blur(0.5px)' };
    return { x: direction > 0 ? '-30%' : '30%', opacity: 1 };
  },
};

export const sheetBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const bottomSheetVariants = {
  hidden: {
    y: 34,
    opacity: 0,
    scaleX: 0.42,
    scaleY: 0.24,
    borderRadius: '2rem',
    filter: 'blur(8px)',
    transformOrigin: '50% 100%',
  },
  visible: {
    y: 0,
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    borderRadius: '1.45rem',
    filter: 'blur(0px)',
    transformOrigin: '50% 100%',
  },
  exit: {
    y: 26,
    opacity: 0,
    scaleX: 0.48,
    scaleY: 0.3,
    borderRadius: '2rem',
    filter: 'blur(8px)',
    transformOrigin: '50% 100%',
  },
};
