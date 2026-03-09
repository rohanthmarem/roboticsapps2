import {
  defineInteraction,
  defineProperties,
  useWebsiteSettings,
  RenderHooks,
} from "figma:react";
import { motion, Variants } from "motion/react";
import {
  ComponentType,
  RefObject,
  useCallback,
  useEffect,
  useState,
} from "react";

const VARIANTS: Variants = {
  dragging: (cursor: string) => {
    switch (cursor) {
      case "grab":
        return { cursor: "grabbing" };
      case "move":
        return { cursor: "move" };
      default:
        return {};
    }
  },
  hovering: (cursor: string) => {
    switch (cursor) {
      case "grab":
        return { cursor: "grab" };
      case "move":
        return { cursor: "move" };
      default:
        return {};
    }
  },
};

export default function Draggable({
  bounds,
  children,
  cursor,
  momentum,
}) {
  const [ref, setRef] = useState<
    RefObject<HTMLElement> | undefined
  >(undefined);
  const [boundsRef, setBoundsRef] = useState<
    RefObject<HTMLElement> | undefined
  >(undefined);

  const constraints =
    bounds === "parent" ? boundsRef : undefined;

  const { shouldReduceMotion } = useWebsiteSettings();
  const shouldUseMomentum = momentum && !shouldReduceMotion;

  const updateRefs = useCallback(
    ({
      layerRef,
      parentRef,
      Component,
    }: {
      layerRef: RefObject<HTMLElement>;
      parentRef?: RefObject<HTMLElement>;
      Component: ComponentType<any>;
    }) => {
      if (ref?.current !== layerRef.current) {
        setRef(layerRef);
      }

      if (boundsRef?.current !== parentRef?.current) {
        setBoundsRef(parentRef);
      }

      return <Component />;
    },
    [boundsRef, ref],
  );

  useEffect(() => {
    if (ref?.current) {
      ref.current.style.pointerEvents = "none";
    }
  }, [ref]);

  return (
    <motion.div
      className="*:pointer-events-none"
      drag
      dragConstraints={constraints}
      dragElastic={shouldUseMomentum ? 0.12 : 0}
      dragMomentum={shouldUseMomentum}
      dragTransition={{
        power: 0.12,
        timeConstant: 120,
      }}
      custom={cursor}
      whileHover="hovering"
      whileTap="dragging"
      variants={VARIANTS}
    >
      <RenderHooks
        children={children}
        getLayerRef={updateRefs}
      />
    </motion.div>
  );
}

defineProperties(Draggable, {
  momentum: {
    type: "boolean",
    defaultValue: false,
    label: "sites.code_behaviors.draggable.momentum",
  },
  bounds: {
    type: "string",
    defaultValue: "anywhere",
    label: "sites.code_behaviors.draggable.bounds",
    control: "select",
    options: [
      {
        label: "sites.code_behaviors.draggable.bounds.anywhere",
        value: "anywhere",
      },
      {
        label: "sites.code_behaviors.draggable.bounds.parent",
        value: "parent",
      },
    ],
  },
  cursor: {
    type: "string",
    defaultValue: "grab",
    label: "sites.code_behaviors.draggable.cursor",
    control: "select",
    options: [
      {
        label: "sites.code_behaviors.draggable.cursor.auto",
        value: "auto",
      },
      {
        label: "sites.code_behaviors.draggable.cursor.grab",
        value: "grab",
      },
      {
        label: "sites.code_behaviors.draggable.cursor.move",
        value: "move",
      },
    ],
  },
});

defineInteraction(Draggable, {
  name: "sites.code_behaviors.draggable.name",
  icon: "drag",
  category: "mouse",
});