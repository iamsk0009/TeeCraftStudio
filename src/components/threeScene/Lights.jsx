import { Environment } from '@react-three/drei'

function Lights() {
    const envmap = `/hdri/envmap1.hdr`;
    return (
        <>
            <ambientLight />
            <Environment
                files={envmap}
                environmentIntensity={0.11}
            />
        </>
    )
}

export default Lights