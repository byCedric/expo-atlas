import ReactECharts from 'echarts-for-react';
import {
  type ComponentProps,
  type RefObject,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react';

export const Graph = forwardRef<ReactECharts, ComponentProps<typeof ReactECharts>>((props, ref) => {
  const container = useRef<HTMLDivElement>(null);
  const containerHeight = useDynamicHeight(container);

  const echartOptions = {
    ...(props.opts ?? {}),
    height: props.opts?.height ?? containerHeight,
  };

  return (
    <div ref={container} className="flex-1">
      <ReactECharts lazyUpdate {...props} opts={echartOptions} ref={ref} />
    </div>
  );
});

let lastKnownHeight = 300;

function useDynamicHeight<T extends HTMLElement>(
  ref: RefObject<T>,
  initialHeight = lastKnownHeight
) {
  const [size, setSize] = useState({ height: initialHeight, width: 0 });

  useEffect(() => {
    lastKnownHeight = size.height;
  }, [size.height]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize(entry.contentRect);
      }
    });

    if (ref.current) resizeObserver.observe(ref.current);

    return () => {
      if (ref.current) resizeObserver.unobserve(ref.current);
    };
  }, [ref]);

  return size.height;
}
