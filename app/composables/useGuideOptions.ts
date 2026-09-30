export function useGuideOptions() {
 return useFetch('/api/guide-options', {key:'guide-options',default:()=>({communities:[] as string[],locations:[] as string[]})})
}
