import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const ParticleVisualizer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [burstMode, setBurstMode] = useState(false) // State for burst mode

  // List available audio input devices
  const listAudioDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const audioDevices = devices.filter(device => device.kind === 'audioinput')
    setAudioInputDevices(audioDevices)
    if (audioDevices.length > 0) {
      setSelectedDeviceId(audioDevices[0].deviceId) // Set default to the first available device
    }
  }

  // Function to capture audio from the selected input device
  const captureAudio = async (deviceId: string): Promise<AnalyserNode | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } }
      })
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      analyser.fftSize = 256
      return analyser
    } catch (error) {
      console.error('Error capturing audio:', error)
      return null
    }
  }

  useEffect(() => {
    // List audio input devices when the component mounts
    listAudioDevices()
  }, [])

  useEffect(() => {
    // Initialize particles and the Three.js scene
    const initParticles = async () => {
      if (selectedDeviceId) {
        const analyser = await captureAudio(selectedDeviceId) // Capture audio from the selected device
        analyserRef.current = analyser
      }
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer()
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0xffffff, 1)

    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement)
    }

    const particles = new THREE.BufferGeometry()
    const particleCount = 500
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3) // Store particle velocities

    // Initialize particle positions and velocities
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10

      // Initialize random velocities for burst mode
      velocities[i * 3] = (Math.random() - 0.5) * 2
      // velocities[i * 3 + 1] = (Math.random() - 0.5) * 2
      // velocities[i * 3 + 2] = (Math.random() - 0.5) * 2
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x000000,
      size: 0.07
    })

    const particleSystem = new THREE.Points(particles, particleMaterial)
    scene.add(particleSystem)

    camera.position.z = 7
    camera.position.y = 1.5

    const animate = () => {
      requestAnimationFrame(animate)

      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)

        const positions = particleSystem.geometry.attributes.position.array as Float32Array
        for (let i = 0; i < particleCount; i++) {
          const scale = dataArray[i % dataArray.length] / 255.0

          if (burstMode) {
            // Burst mode: move particles in all directions based on velocities
            positions[i * 3] += velocities[i * 3] * scale
            // positions[i * 3 + 1] += velocities[i * 3 + 1] * scale
            // positions[i * 3 + 2] += velocities[i * 3 + 2] * scale

            // Ensure particles stay within a boundary (reset them if they go too far)
            if (Math.abs(positions[i * 3]) > 10) positions[i * 3] = (Math.random() - 0.5) * 10
            if (Math.abs(positions[i * 3 + 1]) > 10) positions[i * 3 + 1] = (Math.random() - 0.5) * 10
            if (Math.abs(positions[i * 3 + 2]) > 10) positions[i * 3 + 2] = (Math.random() - 0.5) * 10
          } else {
            // Default mode: move particles up and down
            positions[i * 3 + 1] = scale * 3.0
          }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true
      }

      particleSystem.rotation.y += 0.0009
      renderer.render(scene, camera)
    }
    animate()

    initParticles()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [selectedDeviceId, burstMode]) // Include burstMode in dependency array

  return (
    <div>
      <div>
        <label>Select Audio Input: </label>
        <select onChange={e => setSelectedDeviceId(e.target.value)} value={selectedDeviceId || ''}>
          {audioInputDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Device ${device.deviceId}`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Burst Mode: </label>
        <input type="checkbox" checked={burstMode} onChange={e => setBurstMode(e.target.checked)} />
      </div>

      <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />
    </div>
  )
}

export default ParticleVisualizer
