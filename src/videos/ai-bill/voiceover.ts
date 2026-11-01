import { makeVoiceover } from "../../lib/voiceover";
import manifest from "./data/voiceover.json";
import narration from "./narration.json";
import { scene } from "./timeline";

export const { HAS_VOICE, captionCues } = makeVoiceover(narration, manifest, (id) => scene(id).from);
