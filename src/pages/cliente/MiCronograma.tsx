import { useState } from "react";


export default function MiCronograma(){
    const [postItAbierto, setPostItAbierto] = useState<number | null>(null);
    return(
        <div className="min-h-full min-w-0 w-full bg-[#181B1E] p-4 sm:p-6 lg:p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">
                Mi Cronograma
            </h1>

            <p className="text-gray-500 mb-6">
                Organiza tus entrenamientos y ejercicios.
            </p>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 justify-items-center items-start">
                <div className={`relative transition-[width,height] duration-300 ease-out ${
                    postItAbierto === 0 ? "w-[300px] h-[400px]" : "w-[200px] h-[250px]"
                }`}>
                    <div
                        className={`bg-[#FF5722] border-[#FF5722] rounded-xl shadow-md border p-5 text-black
                                    transition-[width,height,box-shadow] duration-300 ease-out
                        ${
                            postItAbierto===0
                                ? "w-[300px] h-[400px] shadow-xl"
                                : "w-[200px] h-[250px] shadow-md"
                        }`}
                    >
                        {postItAbierto !==0?(
                            <div
                                onClick={() => setPostItAbierto(0)}
                                className="w-full h-full flex items-center justify-center cursor-pointer"    
                            >
                                <span className="text-6xl font-light text-black">
                                    +   
                                </span>
                            </div>
                        ):(
                            <div
                                className={`transition-opacity duration-200 ${
                                    postItAbierto === 0
                                        ? "opacity-100 delay-300"
                                        : "opacity-0"
                                }`}
                            >
                                <h2 className="text-xl font-semibold mb-3">
                                    Nuevo entrenamiento
                                </h2>

                                <label className="block text-sm font-medium mb-1">
                                    Fecha
                                </label>
                                <div className="mb-2">
                                    <input 
                                        type="date"
                                        className="w-full border rounded-md p-1.5 text-sm"
                                    />
                                </div>
                                <div className="mb-2">
                                    <label className="block text-sm font-medium mb-1">
                                        Rutina
                                    </label>
                                    <select className="w-full border rounded-lg px-3 py-1.5 text-black">
                                        <option value="">Seleccionar rutina</option>
                                        <option value="rutina1">Rutina de Pecho</option>
                                        <option value="rutina2">Rutina de Piernas</option>
                                        <option value="rutina3">Rutina de Espalda</option>
                                    </select>
                                </div>
                                <div className="mb-2">
                                    <label className="block text-sm font-medium mb-1">
                                        Ejericios
                                    </label>
                                    <select className="w-full border rounded-lg px-3 py-1.5 text-black">
                                        <option value="">Seleccionar ejercicio</option>
                                        <option value="ejercicio1">Press de banca</option>
                                        <option value="ejercicio2">Sentadilla</option>
                                        <option value="ejercicio3">Remo con barra</option>
                                    </select>
                                </div>
                                <div className="mb-2">
                                    <label className="block text-sm font-medium mb-1">
                                        Nota
                                    </label>
                                    <textarea 
                                        placeholder="Escribe una nota..."
                                        rows={2}
                                        className="w-full border rounded-md p-1.5 text-sm resize-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <button 
                                        type="button"
                                        className="bg-black text-white px-3 py-1.5 rounded-md text-sm"
                                    >
                                        Guardar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPostItAbierto(null)}
                                        className="border border-black px-3 py-1.5 rounded-md text-sm"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`relative transition-[width,height] duration-300 ease-out ${
                    postItAbierto === 1 ? "w-[300px] h-[400px]" : "w-[200px] h-[250px]"
                }`}>
                    <div
                        onClick={() => setPostItAbierto(1)}
                        className={`bg-[#FF5722] rounded-xl shadow-md border p-4 text-black
                                    cursor-pointer
                                    transition-[width,height,box-shadow] duration-300 ease-out
                        ${
                            postItAbierto === 1
                                ? "w-[300px] h-[400px] shadow-xl"
                                : "w-[200px] h-[250px]"
                        }`}
                    >
                        {postItAbierto !== 1 ? (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold">
                                    05 OCT
                                </span>

                                <span className="text-lg font-medium mt-1">
                                    Lunes
                                </span>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    Entrenamiento
                                </h2>

                                <div className="mb-2">
                                    <p className="text-sm font-medium mb-1">
                                        Fecha
                                    </p>
                                    <div className="w-full border rounded-md p-1.5 text-sm bg-white">
                                        05/10/2026
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <p className="text-sm font-medium mb-1">
                                        Rutina
                                    </p>
                                    <div className="w-full border rounded-md p-1.5 text-sm bg-white">
                                        Rutina de Pecho
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <p className="text-sm font-medium mb-1">
                                        Ejercicio
                                    </p>
                                    <div className="w-full border rounded-md p-1.5 text-sm bg-white">
                                        Press de banca
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <p className="text-sm font-medium mb-1">
                                        Nota
                                    </p>
                                    <div className="w-full border rounded-md p-1.5 text-sm bg-white min-h-[52px]">
                                        Trabajar con peso moderado.
                                    </div>
                                </div>

                                <div className="flex justify-start items-center gap-2 mt-0">
                                    <button
                                        type="button"
                                        className="bg-black text-white px-3 py-1.5 rounded-md text-sm"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPostItAbierto(null);
                                        }}
                                        className="border border-black px-3 py-1.5 rounded-md text-sm"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`relative transition-[width,height] duration-300 ease-out ${
                    postItAbierto === 2 ? "w-[300px] h-[400px]" : "w-[200px] h-[250px]"
                }`}>
                    <div 
                        onClick={() => setPostItAbierto(2)}

                        className={`bg-[#FF5722] rounded-xl shadow-md border p-4 text-black
                                    cursor-pointer
                                    transition-[width,height,box-shadow] duration-300 ease-out
                        ${
                            postItAbierto === 2
                                ? "w-[300px] h-[400px] shadow-xl"
                                : "w-[200px] h-[250px]"
                        }`}
                    >
                        {postItAbierto !==2 ?(
                            <div className="w-full h-full flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold">
                                    07 OCT
                                </span>
                                <span className="text-lg font-medium mt-1">
                                    Miércoles
                                </span>
                            </div>
                        ):( 
                            <div>
                                <h2 className="text-xl font-semibold mb-2">
                                    Entrenamiento
                                </h2>

                                <div className="mb-2">
                                    <p className="text-sm font-medium mb-1">
                                        Fecha
                                    </p>
                                    <div className="w-full border rounded-md p-1.5 text-sm bg-white">
                                        07/10/2026
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <p className="text-sm font-medium mb-1">
                                        Rutina
                                    </p>
                                    <div className="w-full border rounded-md p-1.5 text-sm bg-white">
                                        Rutina de Piernas 
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <p className="text-sm font-medium mb-1">
                                        Ejercicios
                                    </p>
                                    <div className="w-full border rounded-md p-1.5 text-sm bg-white">
                                        Sentadilla
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <p className="text-sm font-medium mb-1">
                                        Nota
                                    </p>
                                    <div className="w-full border rounded-md p-1.5 text-sm bg-white min-h-[52px]">
                                        Mantener una postura correcta.
                                    </div>
                                </div>

                                <div className="flex justify-start items-center gap-2 mt-0">
                                    <button 
                                        type="button"
                                        className="bg-black text-white px-3 py-1.5 rounded-md text-sm"
                                    >
                                        Editar
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={(e)=>{
                                            e.stopPropagation();
                                            setPostItAbierto(null);
                                        }}
                                        className="border border-black px-3 py-1.5 rounded-md text-sm"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        )}  
                    </div>
                </div>

                <div className="w-[200px] h-[250px] relative">
                    <div className="w-[200px] h-[250px] bg-[#FF5722] rounded-xl shadow-md border p-5 text-black">

                        <div className="w-full h-full flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold">
                                09 OCT
                            </span>

                            <span className="text-lg font-medium mt-1">
                                Viernes
                            </span>
                        </div>

                    </div>
                </div>

                <div className="w-[200px] h-[250px] relative">
                    <div className="w-[200px] h-[250px] bg-[#FF5722] rounded-xl shadow-md border p-5 text-black">

                        <div className="w-full h-full flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold">
                                12 OCT
                            </span>

                            <span className="text-lg font-medium mt-1">
                                Lunes
                            </span>
                        </div>

                    </div>
                </div>

                <div className="w-[200px] h-[250px] relative">
                    <div className="w-[200px] h-[250px] bg-[#FF5722] rounded-xl shadow-md border p-5 text-black">

                        <div className="w-full h-full flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold">
                                14 OCT
                            </span>

                            <span className="text-lg font-medium mt-1">
                                Miércoles
                            </span>
                        </div>

                    </div>
                </div>
            </div>
        </div>
        
    )
}
