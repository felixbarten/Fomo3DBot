'use_strict';

// contains extremely obnoxious ascii art.
// Do not use under any circumstances...

var ascii = {

    printICOSmall: function(){
    console.log(`
\n
 ______   ______    ______  
/      | /      \\  /      \\ 
$$$$$$/ /$$$$$$  |/$$$$$$  | 
  $$ |  $$ |  $$/ $$ |  $$ |
  $$ |  $$ |      $$ |  $$ |
  $$ |  $$ |   __ $$ |  $$ |
 _$$ |_ $$ \\__/  |$$ \\__$$ |
/ $$   |$$    $$/ $$    $$/ 
$$$$$$/  $$$$$$/   $$$$$$/  
\n`);                               
},

printICOBlock: function() {
console.log(`\n
.----------------.  .----------------.  .----------------. 
| .--------------. || .--------------. || .--------------. |
| |     _____    | || |     ______   | || |     ____     | |
| |    |_   _|   | || |   .' ___  |  | || |   .'    \`.   | |
| |      | |     | || |  / .'   \\_|  | || |  /  .--.  \\  | |
| |      | |     | || |  | |         | || |  | |    | |  | |
| |     _| |_    | || |  \\ \`.___.'\\  | || |  \\  \`--'  /  | |
| |    |_____|   | || |   \`._____.'  | || |   \`.____.'   | |
| |              | || |              | || |              | |
| '--------------' || '--------------' || '--------------' |
 '----------------'  '----------------'  '----------------' 
`);
},

printICOLarge: function() {
console.log(`\n                                       
IIIIIIIIII        CCCCCCCCCCCCC     OOOOOOOOO     
I::::::::I     CCC::::::::::::C   OO:::::::::OO   
I::::::::I   CC:::::::::::::::C OO:::::::::::::OO 
II::::::II  C:::::CCCCCCCC::::CO:::::::OOO:::::::O
  I::::I   C:::::C       CCCCCCO::::::O   O::::::O
  I::::I  C:::::C              O:::::O     O:::::O
  I::::I  C:::::C              O:::::O     O:::::O
  I::::I  C:::::C              O:::::O     O:::::O
  I::::I  C:::::C              O:::::O     O:::::O
  I::::I  C:::::C              O:::::O     O:::::O
  I::::I  C:::::C              O:::::O     O:::::O
  I::::I   C:::::C       CCCCCCO::::::O   O::::::O
II::::::II  C:::::CCCCCCCC::::CO:::::::OOO:::::::O
I::::::::I   CC:::::::::::::::C OO:::::::::::::OO 
I::::::::I     CCC::::::::::::C   OO:::::::::OO   
IIIIIIIIII        CCCCCCCCCCCCC     OOOOOOOOO     
`);
},
printWakeUpSmall: function() {
console.log(`
               _                      _ 
              | |                    | |
__      ____ _| | _____   _   _ _ __ | |
\\ \\ /\\ / / _\` | |/ / _ \\ | | | | '_ \\| |
 \\ V  V / (_| |   <  __/ | |_| | |_) |_|
  \\_/\\_/ \\__,_|_|\\_\\___|  \\__,_| .__/(_)
                               | |      
                               |_|      
`);
},
printWakeUpSmallAlt: function() {},

printWakeUpLarge: function() {
    
                                                                                                                                            
                                 console.log(`                                                                                                           
                                                         kkkkkkkk                                                                       !!! 
                                                         k::::::k                                                                      !!:!!
                                                         k::::::k                                                                      !:::!
                                                         k::::::k                                                                      !:::!
wwwwwww           wwwww           wwwwwwwaaaaaaaaaaaaa    k:::::k    kkkkkkk eeeeeeeeeeee         uuuuuu    uuuuuu ppppp   ppppppppp   !:::!
 w:::::w         w:::::w         w:::::w a::::::::::::a   k:::::k   k:::::kee::::::::::::ee       u::::u    u::::u p::::ppp:::::::::p  !:::!
  w:::::w       w:::::::w       w:::::w  aaaaaaaaa:::::a  k:::::k  k:::::ke::::::eeeee:::::ee     u::::u    u::::u p:::::::::::::::::p !:::!
   w:::::w     w:::::::::w     w:::::w            a::::a  k:::::k k:::::ke::::::e     e:::::e     u::::u    u::::u pp::::::ppppp::::::p!:::!
    w:::::w   w:::::w:::::w   w:::::w      aaaaaaa:::::a  k::::::k:::::k e:::::::eeeee::::::e     u::::u    u::::u  p:::::p     p:::::p!:::!
     w:::::w w:::::w w:::::w w:::::w     aa::::::::::::a  k:::::::::::k  e:::::::::::::::::e      u::::u    u::::u  p:::::p     p:::::p!:::!
      w:::::w:::::w   w:::::w:::::w     a::::aaaa::::::a  k:::::::::::k  e::::::eeeeeeeeeee       u::::u    u::::u  p:::::p     p:::::p!!:!!
       w:::::::::w     w:::::::::w     a::::a    a:::::a  k::::::k:::::k e:::::::e                u:::::uuuu:::::u  p:::::p    p::::::p !!! 
        w:::::::w       w:::::::w      a::::a    a:::::a k::::::k k:::::ke::::::::e               u:::::::::::::::uup:::::ppppp:::::::p     
         w:::::w         w:::::w       a:::::aaaa::::::a k::::::k  k:::::ke::::::::eeeeeeee        u:::::::::::::::up::::::::::::::::p  !!! 
          w:::w           w:::w         a::::::::::aa:::ak::::::k   k:::::kee:::::::::::::e         uu::::::::uu:::up::::::::::::::pp  !!:!!
           www             www           aaaaaaaaaa  aaaakkkkkkkk    kkkkkkk eeeeeeeeeeeeee           uuuuuuuu  uuuup::::::pppppppp     !!! 
                                                                                                                    p:::::p                 
                                                                                                                    p:::::p                 
                                                                                                                   p:::::::p                
                                                                                                                   p:::::::p                
                                                                                                                   p:::::::p                
                                                                                                                   ppppppppp                
`);       

},


};

module.exports = ascii;