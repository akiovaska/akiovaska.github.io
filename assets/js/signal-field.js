(() => {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fieldLayers = [...document.querySelectorAll("[data-field-depth]")];
  const routes = [...document.querySelectorAll("[data-route]")];

  let abortController;
  let animationFrame = 0;
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let activeRoute = null;

  const baseTransform = (element, x, y) => {
    if (element.classList.contains("scene__plane--far")) {
      return `translate3d(${x * 0.5}px, ${y * 0.5}px, 0) rotate(-9deg) scale(1.08)`;
    }

    if (element.classList.contains("scene__plane--near")) {
      return `translate3d(${x}px, ${y}px, 0) rotate(7deg) scale(1.03)`;
    }

    const scale = element.dataset.fieldDepth === "near" ? 0.7 : 0.4;
    return `translate3d(${x * scale}px, ${y * scale}px, 0)`;
  };

  const resetField = () => {
    fieldLayers.forEach((element) => {
      element.style.transform = baseTransform(element, 0, 0);
    });
  };

  const resetRoute = (route) => {
    route.style.removeProperty("--tilt-x");
    route.style.removeProperty("--tilt-y");
    route.style.removeProperty("--spot-x");
    route.style.removeProperty("--spot-y");
  };

  const renderPointer = () => {
    animationFrame = 0;

    if (document.hidden) {
      return;
    }

    const normalizedX = Math.max(-1, Math.min(1, (pointerX / window.innerWidth - 0.5) * 2));
    const normalizedY = Math.max(-1, Math.min(1, (pointerY / window.innerHeight - 0.5) * 2));
    const fieldX = normalizedX * 12;
    const fieldY = normalizedY * 12;
    let routeState = null;

    if (activeRoute) {
      const bounds = activeRoute.getBoundingClientRect();
      const localX = Math.max(0, Math.min(1, (pointerX - bounds.left) / bounds.width));
      const localY = Math.max(0, Math.min(1, (pointerY - bounds.top) / bounds.height));

      routeState = {
        localX,
        localY,
        tiltX: (0.5 - localY) * 2.2,
        tiltY: (localX - 0.5) * 2.2,
      };
    }

    fieldLayers.forEach((element) => {
      element.style.transform = baseTransform(element, fieldX, fieldY);
    });

    if (!activeRoute || !routeState) {
      return;
    }

    activeRoute.style.setProperty("--spot-x", `${routeState.localX * 100}%`);
    activeRoute.style.setProperty("--spot-y", `${routeState.localY * 100}%`);
    activeRoute.style.setProperty("--tilt-x", `${routeState.tiltX.toFixed(2)}deg`);
    activeRoute.style.setProperty("--tilt-y", `${routeState.tiltY.toFixed(2)}deg`);
  };

  const queueRender = (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;

    if (!animationFrame) {
      animationFrame = window.requestAnimationFrame(renderPointer);
    }
  };

  const disable = () => {
    abortController?.abort();
    abortController = undefined;

    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    activeRoute = null;
    routes.forEach(resetRoute);
    resetField();
    document.documentElement.removeAttribute("data-signal-enhanced");
  };

  const enable = () => {
    disable();

    if (!finePointer.matches || reducedMotion.matches) {
      return;
    }

    abortController = new AbortController();
    const { signal } = abortController;

    document.documentElement.dataset.signalEnhanced = "true";
    window.addEventListener("pointermove", queueRender, { passive: true, signal });
    window.addEventListener("pointerout", (event) => {
      if (!event.relatedTarget) {
        resetField();
      }
    }, { passive: true, signal });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (animationFrame) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
        resetField();
      }
    }, { signal });

    routes.forEach((route) => {
      route.addEventListener("pointerenter", (event) => {
        activeRoute = route;
        queueRender(event);
      }, { passive: true, signal });

      route.addEventListener("pointermove", queueRender, { passive: true, signal });

      route.addEventListener("pointerleave", () => {
        resetRoute(route);
        if (activeRoute === route) {
          activeRoute = null;
        }
      }, { passive: true, signal });
    });
  };

  finePointer.addEventListener("change", enable);
  reducedMotion.addEventListener("change", enable);
  enable();
})();
