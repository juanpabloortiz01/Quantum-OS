import re
import os

file_path = "src/app/onboarding/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add MapPicker import
if "import dynamic from" not in content:
    content = content.replace(
        'import { finalizeOnboarding',
        'import dynamic from "next/dynamic"\nconst MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false })\nimport { finalizeOnboarding'
    )

# 2. Add locationConfig to formData
content = content.replace(
    'address: "",',
    'locationConfig: { hasPhysicalLocation: true, lat: -0.180653, lng: -78.467834, address: "" },'
)

# 3. Fix Progress Bar and Header Text
content = content.replace('Paso {step}/6', 'Paso {step}/7')
content = content.replace('width: `${(step / 6) * 100}%`', 'width: `${(step / 7) * 100}%`')
content = content.replace('initial={{ width: "16.6%" }}', 'initial={{ width: "14.2%" }}')

header_titles_old = """                  {step === 1 && "Describe tu negocio"}
                  {step === 2 && "Horarios de atención"}
                  {step === 3 && "Sube tu menú"}
                  {step === 4 && "Conexión del Agente IA"}
                  {step === 5 && "Conecta tu WhatsApp"}
                  {step === 6 && "Crear una cuenta"}"""

header_titles_new = """                  {step === 1 && "Describe tu negocio"}
                  {step === 2 && "Ubicación del local"}
                  {step === 3 && "Horarios de atención"}
                  {step === 4 && "Sube tu menú"}
                  {step === 5 && "Conexión del Agente IA"}
                  {step === 6 && "Conecta tu WhatsApp"}
                  {step === 7 && "Crear una cuenta"}"""
content = content.replace(header_titles_old, header_titles_new)

# 4. Remove address textarea from Step 1
address_block = """                      <div>
                        <label className="block text-xs font-semibold text-[#4B5563] mb-1.5 uppercase">{formData.niche === \'agenda\' ? \'Ubicación\' : \'Dirección física (Opcional)\'}</label>
                        <textarea
                          value={formData.contextData.address}
                          onChange={(e) => updateContext("address", e.target.value)}
                          placeholder={formData.niche === "agenda" ? "Ejem: Av. Amazonas N24-15, Edificio Médico, Oficina 302" : "Calle Larga 4-56 y Benigno Malo"}
                          className="w-full h-16 bg-white border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#1A1A1A] focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none resize-none transition-all"
                        />
                      </div>"""
content = content.replace(address_block, "")

# 5. Shift all `setStep(X)` where X >= 2
def shift_setStep(match):
    val = int(match.group(1))
    if val >= 2:
        return f"setStep({val + 1})"
    return match.group(0)

# Temporarily protect `setStep(1)`
content = re.sub(r'setStep\((\d+)\)', shift_setStep, content)

# 6. Shift all `{step === X &&` where X >= 2
def shift_step_eq(match):
    val = int(match.group(1))
    if val >= 2:
        return f"{{step === {val + 1} &&"
    return match.group(0)

content = re.sub(r'\{step === (\d+) &&', shift_step_eq, content)

# 7. Shift `step === X` in initial step loading
content = content.replace('setStep(6)', 'setStep(7)') # Manual edge cases
# Wait, shift_setStep already handled setStep(6) -> setStep(7).
# Let's fix the specific "Continuar a horarios" button in Step 1
content = content.replace('Continuar a horarios', 'Continuar a ubicación')

# 8. Inject new Step 2
new_step_2 = """
              {/* ── PASO 2: UBICACIÓN DEL LOCAL ── */}
              {step === 2 && (
                <motion.div
                  key="step2-location"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 p-4 border border-[#E2E8F0] bg-[#FBFBFA] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                         onClick={() => {
                           setFormData(prev => ({
                             ...prev,
                             contextData: {
                               ...prev.contextData,
                               locationConfig: {
                                 ...prev.contextData.locationConfig,
                                 hasPhysicalLocation: !prev.contextData.locationConfig.hasPhysicalLocation
                               }
                             }
                           }))
                         }}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${!formData.contextData.locationConfig.hasPhysicalLocation ? "bg-[#1A1A1A] border-[#1A1A1A]" : "bg-white border-[#94A3B8]"}`}>
                        {!formData.contextData.locationConfig.hasPhysicalLocation && <Check size={14} className="text-white" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#1A1A1A]">No tengo un local físico</span>
                        <span className="text-xs text-[#6B7280]">Solo realizo entregas a domicilio o servicios remotos.</span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {formData.contextData.locationConfig.hasPhysicalLocation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex flex-col gap-4 overflow-hidden"
                        >
                          <div>
                            <label className="block text-xs font-semibold text-[#4B5563] mb-1.5 uppercase">Dirección exacta</label>
                            <input
                              type="text"
                              value={formData.contextData.locationConfig.address || ""}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                contextData: {
                                  ...prev.contextData,
                                  locationConfig: { ...prev.contextData.locationConfig, address: e.target.value }
                                }
                              }))}
                              placeholder="Ej: Av. Amazonas N24-15 y Orellana"
                              className="w-full bg-white border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#1A1A1A] focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#4B5563] mb-1.5 uppercase">Ubicación en el mapa</label>
                            <p className="text-xs text-[#6B7280] mb-3">Toca el mapa para colocar el pin de tu negocio.</p>
                            <MapPicker 
                              lat={formData.contextData.locationConfig.lat} 
                              lng={formData.contextData.locationConfig.lng} 
                              onChange={(lat, lng) => setFormData(prev => ({
                                ...prev,
                                contextData: {
                                  ...prev.contextData,
                                  locationConfig: { ...prev.contextData.locationConfig, lat, lng }
                                }
                              }))}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.div variants={itemVariants} className="flex gap-3 pt-4 border-t border-[#E2E8F0] mt-2">
                    <button
                      onClick={() => setStep(1)}
                      className="px-5 py-3 border border-[#E2E8F0] rounded-lg text-[#4B5563] text-sm font-medium hover:bg-[#F9FAFB] transition-colors active:scale-95"
                    >
                      ← Atrás
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={
                        formData.contextData.locationConfig.hasPhysicalLocation && 
                        (!formData.contextData.locationConfig.address || formData.contextData.locationConfig.lat === 0)
                      }
                      className="flex-1 py-3 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333] active:scale-[0.98]"
                    >
                      Continuar a horarios
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* ── PASO 3: HORARIOS DE ATENCIÓN ── */}
"""
content = content.replace('{/* ── PASO 3: HORARIOS DE ATENCIÓN ── */}', new_step_2)

# Fix double replace issues if any
content = content.replace('{/* ── PASO 3: HORARIOS DE ATENCIÓN ── */}', '{/* ── PASO 3: HORARIOS DE ATENCIÓN ── */}', 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied successfully.")
