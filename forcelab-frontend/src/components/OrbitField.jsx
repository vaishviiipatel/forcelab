import React, { useState, useEffect, useRef } from 'react';

const generateSystemOrbits = () => {
  return [
    {
      horizontalRadius: 400,
      flatnessRatio: 0.6,
      rotationAngle: 0.3,
      rotationVelocity: 0.0002,
      orbitalSpeed: 0.015,
      satellites: [
        { offsetAngle: 0, diameter: 2.5, hue: '14, 165, 233', opacity: 0.5, isMajorNode: false },
        { offsetAngle: 2.5, diameter: 4.5, hue: '14, 165, 233', opacity: 0.8, isMajorNode: true }
      ]
    },
    {
      horizontalRadius: 750,
      flatnessRatio: 0.5,
      rotationAngle: -0.5,
      rotationVelocity: -0.0001,
      orbitalSpeed: 0.008,
      satellites: [
        { offsetAngle: 1.2, diameter: 3.5, hue: '99, 102, 241', opacity: 0.6, isMajorNode: false },
        { offsetAngle: 4.8, diameter: 3, hue: '14, 165, 233', opacity: 0.5, isMajorNode: false }
      ]
    },
    {
      horizontalRadius: 1100,
      flatnessRatio: 0.55,
      rotationAngle: 0.7,
      rotationVelocity: 0.0001,
      orbitalSpeed: 0.004,
      satellites: [
        { offsetAngle: 2.1, diameter: 4, hue: '236, 72, 1 pink', opacity: 0.4, isMajorNode: false },
        { offsetAngle: 3.8, diameter: 5.5, hue: '99, 102, 241', opacity: 0.8, isMajorNode: true }
      ]
    },
    {
      horizontalRadius: 1450,
      flatnessRatio: 0.5,
      rotationAngle: -0.2,
      rotationVelocity: -0.00005,
      orbitalSpeed: 0.002,
      satellites: [
        { offsetAngle: 0.5, diameter: 3, hue: '14, 165, 233', opacity: 0.6, isMajorNode: false },
        { offsetAngle: 5.2, diameter: 4, hue: '99, 102, 241', opacity: 0.5, isMajorNode: false }
      ]
    }
  ];
};
