/* Information-theoretic scoring function.
k: number of submitted responses (attempts)
n: total number of possible responses
*/
export function Log2Score(k: number, n: number): number {
    return Math.log2(n / k);
}
