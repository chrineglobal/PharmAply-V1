import { forwardRef, useContext, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

type PolylineEventProps = {
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onDrag?: (e: google.maps.MapMouseEvent) => void;
  onDragStart?: (e: google.maps.MapMouseEvent) => void;
  onDragEnd?: (e: google.maps.MapMouseEvent) => void;
  onMouseOver?: (e: google.maps.MapMouseEvent) => void;
  onMouseOut?: (e: google.maps.MapMouseEvent) => void;
};

export type PolylineProps = google.maps.PolylineOptions & PolylineEventProps;

export const Polyline = forwardRef<google.maps.Polyline | null, PolylineProps>((props, ref) => {
  const {
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onMouseOver,
    onMouseOut,
    ...polylineOptions
  } = props;

  const map = useMap();
  const polyline = useRef<google.maps.Polyline | null>(null);

  useImperativeHandle(ref, () => polyline.current);

  useEffect(() => {
    if (!polyline.current) {
      polyline.current = new google.maps.Polyline();
    }
  }, []);

  useEffect(() => {
    if (polyline.current && map) {
      polyline.current.setMap(map);
    }
  }, [map]);

  useEffect(() => {
    if (polyline.current) {
      polyline.current.setOptions(polylineOptions);
    }
  }, [polylineOptions]);

  // Event bindings
  useEffect(() => {
    if (!polyline.current) return;
    
    let listeners: google.maps.MapsEventListener[] = [];
    if (onClick) listeners.push(google.maps.event.addListener(polyline.current, 'click', onClick));
    if (onDrag) listeners.push(google.maps.event.addListener(polyline.current, 'drag', onDrag));
    if (onDragStart) listeners.push(google.maps.event.addListener(polyline.current, 'dragstart', onDragStart));
    if (onDragEnd) listeners.push(google.maps.event.addListener(polyline.current, 'dragend', onDragEnd));
    if (onMouseOver) listeners.push(google.maps.event.addListener(polyline.current, 'mouseover', onMouseOver));
    if (onMouseOut) listeners.push(google.maps.event.addListener(polyline.current, 'mouseout', onMouseOut));

    return () => {
      listeners.forEach(listener => google.maps.event.removeListener(listener));
    };
  }, [onClick, onDrag, onDragStart, onDragEnd, onMouseOver, onMouseOut]);

  return null;
});
