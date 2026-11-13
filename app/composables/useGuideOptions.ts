export function useGuideOptions(server = true) {
 return useFetch('/api/guide-options', {key:'guide-options',server,default:()=>({communities:[] as string[],locations:[] as string[]})})
}
