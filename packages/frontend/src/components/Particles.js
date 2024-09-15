// @ts-nocheck
import ParticleBackground from 'react-particle-backgrounds';

export const Particles = () => {

  const settings = {
    canvas: {
      canvasFillSpace: true,
      height: 200,
      width: 200,
      useBouncyWalls: false,
    },
    particle: {
      particleCount: 50,
      color: '#abc4c9',
      minSize: 1,
      maxSize: 2
    },
    velocity: {
      directionAngle: 0,
      directionAngleVariance: 30,
      minSpeed: 0.1,
      maxSpeed: 0.2 
    },
    opacity: {
      minOpacity: 0,
      maxOpacity: 0.5,
      opacityTransitionTime: 10000
    }
  }

  return (
      <div style={{position: "Absolute", height: "100vh", width: "100vw"}}>
        <ParticleBackground settings={settings} />

      </div>
  )
}
