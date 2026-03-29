export const isOverSvg = (element, svgRef) => {
    const svgBounds = svgRef.current?.getBoundingClientRect();
    if (!svgBounds) return false;
  
    const elementBounds = element.getBoundingClientRect();
  
    return (
      elementBounds.left < svgBounds.right &&
      elementBounds.right > svgBounds.left &&
      elementBounds.top < svgBounds.bottom &&
      elementBounds.bottom > svgBounds.top
    );
  };