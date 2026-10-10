import { useState } from "react";
export default function MiPerfil() {
  const[editando, setEditando]=useState(false);

  const[nombre, setNombre]=useState("Harrison Loyer");
  const[apellido, setApellidos]=useState("Cachique Shupingahua");
  const[nickname, setNickname]=useState("Harley");
  const[correo, setCorreo]=useState("Harley@gmail.com");
  const[telefono, setTelefono] = useState("999 999 999");
  const[fechaNac, setFechaNac] = useState("17/10/2023")

  return (
    <div className="min-h-full min-w-0 bg-[#181B1E] p-4 sm:p-6 lg:p-8 text-white">
      <h1 className="text-3xl font-bold">
        Mi Perfil
      </h1>
      
      <p className="text-zinc-400 mt-1">
        Administra tu información personal.
      </p>

      <div className="w-full min-w-0 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
        <div className="h-32 sm:h-40 md:h-48 lg:h-56 relative overflow-hidden">
          <img
          src="/portada.jpg"
          alt="Foto de portada"
          className="w-full h-full object-cover"
        />
        </div>

        <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5 min-w-0">
            <div  className="-mt-16 relative">
              <div className="w-32 h-32 rounded-full bg-zinc-800 border-4 border-zinc-900 
                  flex items-center justify-center overflow-hidden">
                    <img
                      src="/perfil.jpg"
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
              </div>

              {editando && (
                <button 
                  type="button"
                  className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-orange-500 
                  text-black flex items-center justify-center hover:bg-orange-400"    
                >
                  ✎
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0 break-words">
              <h2 className="text-2xl font-bold">
                {nombre} {apellido}
              </h2>
              <p className="text-zinc-400">
                @{nickname}
              </p>
            </div>

            <div>
              {!editando?(
                <button 
                  type="button"
                  onClick={()=> setEditando(true)}
                  className="bg-orange-500 text-black font-medium px-5 py-2 rounded-lg 
                  hover:bg-orange-400 transition"
                >
                  Editar Perfil
                </button>
              ):(
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="bg-orange-500 text-black font-medium px-5 py-2.5 rounded-lg 
                  hover:bg-orange-400 transition"         
                >
                  Guardar Cambios
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-800 mt-8 pt-8">
              <h3 className="text-xl font-semibold mb-6">
                Información Personal
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Nombre
                  </label>

                  <input 
                    type="text"
                    value={nombre}
                    onChange={(e)=>setNombre(e.target.value)}
                    disabled={!editando}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white
                              outline-none focus:border-orange-500 disabled:opacity-70"   
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Apellidos
                  </label>

                  <input 
                    type="text" 
                    value={apellido}
                    onChange={(e)=>setApellidos(e.target.value)}
                    disabled={!editando}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white 
                    outline-none focus:border-orange-500 disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                      Nickname
                  </label>

                  <input 
                    type="text" 
                    value={nickname}
                    onChange={(e)=>setNickname(e.target.value)}
                    disabled={!editando}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white 
                    outline-none focus:border-orange-500 disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Correo Electrónico
                  </label>

                  <input 
                    type="text" 
                    value={correo}
                    onChange={(e)=>setCorreo(e.target.value)}
                    disabled={!editando}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white 
                    outline-none focus:border-orange-500 disabled:opacity-70"  
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Teléfono
                  </label>

                  <input 
                    type="text" 
                    value={telefono}
                    onChange={(e)=>setTelefono(e.target.value)}
                    disabled={!editando}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white 
                    outline-none focus:border-orange-500 disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Fecha de nacimiento
                  </label>

                  <input 
                    type="text" 
                    value={fechaNac}
                    onChange={(e)=>setFechaNac(e.target.value)}
                    disabled={!editando}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white 
                    outline-none focus:border-orange-500 disabled:opacity-70"
                  />
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}