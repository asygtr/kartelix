export const iosEase = [0.22, 1, 0.36, 1];

export const springSoft = {
  type: 'spring',
  stiffness: 430,
  damping: 40,
  mass: 0.86,
};

export const pageTransition = {
  duration: 0.18,
  ease: iosEase,
};

export const sheetTransition = {
  type: 'spring',
  stiffness: 540,
  damping: 44,
  mass: 0.82,
};

export const navIndicatorTransition = {
  duration: 0.22,
  ease: iosEase,
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
  stiffness: 460,
  damping: 42,
  mass: 0.82,
};

export const routeVariants = {
  enter: ({ direction = 1, travel = 1, isDesktop = false } = {}) => {
    if (isDesktop) {
      return {
        x: direction > 0 ? 18 : -18,
        opacity: 0,
        filter: 'blur(0.8px)',
      };
    }

    return {
      x: direction > 0 ? 10 : -10,
      opacity: 0,
      filter: 'blur(0px)',
    };
  },
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: ({ direction = 1, travel = 1, isDesktop = false } = {}) => {
    if (isDesktop) {
      return {
        x: direction > 0 ? -14 : 14,
        opacity: 0,
        filter: 'blur(0.6px)',
      };
    }

    return {
      x: direction > 0 ? -8 : 8,
      opacity: 0,
      filter: 'blur(0px)',
    };
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
