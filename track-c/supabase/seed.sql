-- Seed profiles
INSERT INTO public.profiles (id) VALUES ('local') ON CONFLICT (id) DO NOTHING;

-- Seed diagnosis
INSERT INTO public.diagnosis (id, user_id, intake_raw, model, prompt_version, taxonomy_version, raw_model_output, abstained, refused, evidence, bottleneck, prediction, created_at)
VALUES (
  '08d07dab-66e1-4c89-99c6-c9a0810310dc',
  'local',
  '{"product": "An AI email assistant", "stage": "idea", "multiStage": "no", "stages": "1. UI design\\n2. Simple prompt wrapper", "loudClaim": "We need custom fine-tuned model", "actualBehavior": "Read some blog posts and tutorials"}',
  'claude-sonnet-4-6',
  'move2-v1',
  'move2-v1',
  NULL,
  false,
  true,
  NULL,
  NULL,
  NULL,
  '2026-06-23T14:04:49.085Z'
) ON CONFLICT (id) DO NOTHING;
