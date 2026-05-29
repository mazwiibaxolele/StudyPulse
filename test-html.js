async function test() {
  try {
    const res = await fetch('https://study-pulseo.vercel.app');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body start:', text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}
test();
